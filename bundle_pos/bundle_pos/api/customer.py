# -*- coding: utf-8 -*-
# Copyright (c) 2024, Your Company and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import cstr

@frappe.whitelist()
def search_customers(query, pos_profile=None, limit=20):
    """
    Search customers by name, phone, or email
    """
    if not query:
        return []
        
    query = cstr(query).strip()
    if len(query) < 2:
        return []
    
    # Get customer groups from POS profile if provided
    customer_groups = []
    if pos_profile:
        profile_doc = frappe.get_doc("Bundle POS Profile", pos_profile)
        customer_groups = profile_doc.get_applicable_customer_groups()
    
    # Build search conditions
    conditions = []
    values = []
    
    # Search in customer name
    conditions.append("(customer_name LIKE %s OR name LIKE %s)")
    values.extend([f"%{query}%", f"%{query}%"])
    
    # Search in mobile number
    conditions.append("mobile_no LIKE %s")
    values.append(f"%{query}%")
    
    # Search in email
    conditions.append("email_id LIKE %s")
    values.append(f"%{query}%")
    
    # Customer group filter
    customer_group_condition = ""
    if customer_groups:
        customer_group_condition = f" AND customer_group IN ({', '.join(['%s'] * len(customer_groups))})"
        values.extend(customer_groups)
    
    # Build final query
    sql_query = f"""
        SELECT 
            name,
            customer_name,
            mobile_no,
            email_id,
            customer_group,
            territory,
            customer_type,
            default_currency,
            default_price_list
        FROM `tabCustomer`
        WHERE 
            disabled = 0
            AND ({' OR '.join(conditions)})
            {customer_group_condition}
        ORDER BY 
            CASE 
                WHEN customer_name LIKE %s THEN 1
                WHEN name LIKE %s THEN 2
                WHEN mobile_no LIKE %s THEN 3
                ELSE 4
            END,
            customer_name
        LIMIT %s
    """
    
    # Add values for ordering
    values.extend([f"{query}%", f"{query}%", f"{query}%", limit])
    
    customers = frappe.db.sql(sql_query, values, as_dict=True)
    
    # Add additional customer details
    for customer in customers:
        # Get primary address
        address = get_customer_primary_address(customer.name)
        customer.update(address)
        
        # Get primary contact
        contact = get_customer_primary_contact(customer.name)
        customer.update(contact)
    
    return customers

@frappe.whitelist()
def get_customer_details(customer):
    """
    Get detailed customer information for POS
    """
    if not customer:
        return {}
    
    customer_doc = frappe.get_doc("Customer", customer)
    
    # Get customer addresses
    addresses = frappe.get_all("Address", 
        filters={
            "link_doctype": "Customer",
            "link_name": customer
        },
        fields=["name", "address_title", "address_line1", "address_line2", 
               "city", "state", "pincode", "country", "is_primary_address"]
    )
    
    # Get customer contacts
    contacts = frappe.get_all("Contact", 
        filters={
            "link_doctype": "Customer",
            "link_name": customer
        },
        fields=["name", "first_name", "last_name", "email_id", "mobile_no", 
               "phone", "is_primary_contact"]
    )
    
    return {
        "customer": customer_doc.as_dict(),
        "addresses": addresses,
        "contacts": contacts
    }

@frappe.whitelist()
def create_customer(customer_data):
    """
    Create a new customer from POS
    """
    try:
        # Validate required fields
        if not customer_data.get("customer_name"):
            frappe.throw(_("Customer Name is required"))
        
        # Create customer document
        customer_doc = frappe.new_doc("Customer")
        customer_doc.customer_name = customer_data.get("customer_name")
        customer_doc.customer_type = customer_data.get("customer_type", "Individual")
        customer_doc.customer_group = customer_data.get("customer_group", "Individual")
        customer_doc.territory = customer_data.get("territory", "All Territories")
        
        if customer_data.get("mobile_no"):
            customer_doc.mobile_no = customer_data.get("mobile_no")
        
        if customer_data.get("email_id"):
            customer_doc.email_id = customer_data.get("email_id")
        
        customer_doc.insert(ignore_permissions=True)
        
        # Create address if provided
        if customer_data.get("address_line1"):
            address_doc = frappe.new_doc("Address")
            address_doc.address_title = customer_data.get("customer_name")
            address_doc.address_type = "Billing"
            address_doc.address_line1 = customer_data.get("address_line1")
            address_doc.address_line2 = customer_data.get("address_line2", "")
            address_doc.city = customer_data.get("city", "")
            address_doc.state = customer_data.get("state", "")
            address_doc.pincode = customer_data.get("pincode", "")
            address_doc.country = customer_data.get("country", "")
            address_doc.append("links", {
                "link_doctype": "Customer",
                "link_name": customer_doc.name
            })
            address_doc.insert(ignore_permissions=True)
        
        # Create contact if mobile or email provided
        if customer_data.get("mobile_no") or customer_data.get("email_id"):
            contact_doc = frappe.new_doc("Contact")
            contact_doc.first_name = customer_data.get("customer_name")
            if customer_data.get("mobile_no"):
                contact_doc.mobile_no = customer_data.get("mobile_no")
            if customer_data.get("email_id"):
                contact_doc.email_id = customer_data.get("email_id")
            contact_doc.append("links", {
                "link_doctype": "Customer",
                "link_name": customer_doc.name
            })
            contact_doc.insert(ignore_permissions=True)
        
        frappe.db.commit()
        
        return {
            "success": True,
            "customer": customer_doc.name,
            "customer_name": customer_doc.customer_name
        }
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(f"Error creating customer: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def get_customer_primary_address(customer):
    """Get customer's primary address"""
    address = frappe.db.sql("""
        SELECT 
            addr.address_line1,
            addr.address_line2,
            addr.city,
            addr.state,
            addr.pincode,
            addr.country
        FROM `tabAddress` addr
        JOIN `tabDynamic Link` dl ON dl.parent = addr.name
        WHERE 
            dl.link_doctype = 'Customer'
            AND dl.link_name = %s
            AND addr.is_primary_address = 1
        LIMIT 1
    """, customer, as_dict=True)
    
    if address:
        return {
            "address_line1": address[0].address_line1,
            "address_line2": address[0].address_line2,
            "city": address[0].city,
            "state": address[0].state,
            "pincode": address[0].pincode,
            "country": address[0].country
        }
    
    return {}

def get_customer_primary_contact(customer):
    """Get customer's primary contact"""
    contact = frappe.db.sql("""
        SELECT 
            cont.mobile_no,
            cont.phone,
            cont.email_id
        FROM `tabContact` cont
        JOIN `tabDynamic Link` dl ON dl.parent = cont.name
        WHERE 
            dl.link_doctype = 'Customer'
            AND dl.link_name = %s
            AND cont.is_primary_contact = 1
        LIMIT 1
    """, customer, as_dict=True)
    
    if contact:
        return {
            "contact_mobile": contact[0].mobile_no,
            "contact_phone": contact[0].phone,
            "contact_email": contact[0].email_id
        }
    
    return {} 