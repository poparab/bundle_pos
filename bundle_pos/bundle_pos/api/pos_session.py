# -*- coding: utf-8 -*-
# Copyright (c) 2024, Your Company and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import flt, now, getdate, get_time
import json

@frappe.whitelist()
def open_pos_session(pos_profile, opening_balance=0):
    """
    Open a new POS session with opening entry
    """
    try:
        # Check if there's already an open session for this user and profile
        existing_session = frappe.db.get_value("POS Opening Entry",
            {
                "pos_profile": pos_profile,
                "user": frappe.session.user,
                "docstatus": 1,
                "status": "Open"
            }
        )
        
        if existing_session:
            frappe.throw(_("A POS session is already open for this profile. Please close it first."))
        
        # Get POS profile details
        profile_doc = frappe.get_doc("Bundle POS Profile", pos_profile)
        
        # Validate user access
        if not profile_doc.is_user_allowed():
            frappe.throw(_("You are not allowed to use this POS Profile"))
        
        # Create POS Opening Entry
        opening_entry = frappe.new_doc("POS Opening Entry")
        opening_entry.period_start_date = getdate()
        opening_entry.period_end_date = getdate()
        opening_entry.pos_profile = pos_profile
        opening_entry.user = frappe.session.user
        opening_entry.company = profile_doc.company
        opening_entry.posting_date = getdate()
        opening_entry.posting_time = get_time()
        
        # Add balance details for each payment method
        for payment_method in profile_doc.payments:
            if payment_method.mode_of_payment == "Cash":
                opening_entry.append("balance_details", {
                    "mode_of_payment": payment_method.mode_of_payment,
                    "opening_amount": flt(opening_balance)
                })
            else:
                opening_entry.append("balance_details", {
                    "mode_of_payment": payment_method.mode_of_payment,
                    "opening_amount": 0
                })
        
        opening_entry.insert()
        opening_entry.submit()
        
        frappe.db.commit()
        
        return {
            "success": True,
            "opening_entry": opening_entry.name,
            "message": _("POS session opened successfully")
        }
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(f"Error opening POS session: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def close_pos_session(pos_profile, closing_balances=None):
    """
    Close POS session with closing entry
    """
    try:
        # Get the open session
        opening_entry = frappe.db.get_value("POS Opening Entry",
            {
                "pos_profile": pos_profile,
                "user": frappe.session.user,
                "docstatus": 1,
                "status": "Open"
            }
        )
        
        if not opening_entry:
            frappe.throw(_("No open POS session found for this profile"))
        
        opening_doc = frappe.get_doc("POS Opening Entry", opening_entry)
        
        # Parse closing balances
        if isinstance(closing_balances, str):
            closing_balances = json.loads(closing_balances)
        
        # Create POS Closing Entry
        closing_entry = frappe.new_doc("POS Closing Entry")
        closing_entry.pos_opening_entry = opening_entry
        closing_entry.period_start_date = opening_doc.period_start_date
        closing_entry.period_end_date = getdate()
        closing_entry.pos_profile = pos_profile
        closing_entry.user = frappe.session.user
        closing_entry.company = opening_doc.company
        closing_entry.posting_date = getdate()
        closing_entry.posting_time = get_time()
        
        # Get all POS invoices for this session
        pos_invoices = get_pos_invoices_for_session(opening_entry)
        
        # Add payment reconciliation details
        for payment_method in opening_doc.balance_details:
            opening_amount = flt(payment_method.opening_amount)
            
            # Calculate expected closing amount
            expected_amount = opening_amount
            for invoice in pos_invoices:
                for payment in invoice.payments:
                    if payment.mode_of_payment == payment_method.mode_of_payment:
                        expected_amount += flt(payment.amount)
            
            # Get actual closing amount from input
            actual_amount = 0
            if closing_balances:
                for balance in closing_balances:
                    if balance.get("mode_of_payment") == payment_method.mode_of_payment:
                        actual_amount = flt(balance.get("closing_amount", 0))
                        break
            
            difference = actual_amount - expected_amount
            
            closing_entry.append("payment_reconciliation", {
                "mode_of_payment": payment_method.mode_of_payment,
                "opening_amount": opening_amount,
                "expected_amount": expected_amount,
                "closing_amount": actual_amount,
                "difference": difference
            })
        
        # Add POS transactions
        for invoice in pos_invoices:
            closing_entry.append("pos_transactions", {
                "pos_invoice": invoice.name,
                "posting_date": invoice.posting_date,
                "posting_time": invoice.posting_time,
                "grand_total": invoice.grand_total,
                "customer": invoice.customer
            })
        
        closing_entry.insert()
        closing_entry.submit()
        
        # Update opening entry status
        opening_doc.status = "Closed"
        opening_doc.save()
        
        frappe.db.commit()
        
        return {
            "success": True,
            "closing_entry": closing_entry.name,
            "message": _("POS session closed successfully")
        }
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(f"Error closing POS session: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def get_current_session(pos_profile):
    """
    Get current open session details
    """
    opening_entry = frappe.db.get_value("POS Opening Entry",
        {
            "pos_profile": pos_profile,
            "user": frappe.session.user,
            "docstatus": 1,
            "status": "Open"
        }
    )
    
    if not opening_entry:
        return {
            "session_open": False,
            "message": _("No open session found")
        }
    
    opening_doc = frappe.get_doc("POS Opening Entry", opening_entry)
    
    # Get session statistics
    pos_invoices = get_pos_invoices_for_session(opening_entry)
    
    total_sales = sum(flt(invoice.grand_total) for invoice in pos_invoices)
    total_transactions = len(pos_invoices)
    
    # Get payment method wise totals
    payment_totals = {}
    for invoice in pos_invoices:
        for payment in invoice.payments:
            mode = payment.mode_of_payment
            if mode not in payment_totals:
                payment_totals[mode] = 0
            payment_totals[mode] += flt(payment.amount)
    
    return {
        "session_open": True,
        "opening_entry": opening_entry,
        "opening_time": opening_doc.posting_time,
        "opening_date": opening_doc.posting_date,
        "total_sales": total_sales,
        "total_transactions": total_transactions,
        "payment_totals": payment_totals,
        "opening_balances": [
            {
                "mode_of_payment": balance.mode_of_payment,
                "opening_amount": balance.opening_amount
            }
            for balance in opening_doc.balance_details
        ]
    }

def get_pos_invoices_for_session(opening_entry):
    """Get all POS invoices for a session"""
    opening_doc = frappe.get_doc("POS Opening Entry", opening_entry)
    
    # Get all sales invoices created after session opening
    invoices = frappe.get_all("Sales Invoice",
        filters={
            "is_pos": 1,
            "docstatus": 1,
            "owner": frappe.session.user,
            "posting_date": [">=", opening_doc.period_start_date],
            "creation": [">=", opening_doc.creation]
        },
        fields=["name", "posting_date", "posting_time", "grand_total", "customer"]
    )
    
    # Get invoice details with payments
    detailed_invoices = []
    for invoice in invoices:
        invoice_doc = frappe.get_doc("Sales Invoice", invoice.name)
        detailed_invoices.append(invoice_doc)
    
    return detailed_invoices

@frappe.whitelist()
def get_session_summary(pos_profile, from_date=None, to_date=None):
    """
    Get session summary for reporting
    """
    filters = {
        "pos_profile": pos_profile,
        "docstatus": 1
    }
    
    if from_date:
        filters["period_start_date"] = [">=", from_date]
    
    if to_date:
        filters["period_end_date"] = ["<=", to_date]
    
    # Get all closing entries
    closing_entries = frappe.get_all("POS Closing Entry",
        filters=filters,
        fields=["name", "period_start_date", "period_end_date", "user", 
               "total_quantity", "grand_total", "net_total"]
    )
    
    return {
        "sessions": closing_entries,
        "total_sessions": len(closing_entries)
    }

@frappe.whitelist() 
def validate_session_access(pos_profile):
    """
    Validate if user can access POS profile
    """
    try:
        profile_doc = frappe.get_doc("Bundle POS Profile", pos_profile)
        
        if not profile_doc.is_user_allowed():
            return {
                "success": False,
                "error": _("You are not allowed to use this POS Profile")
            }
        
        return {
            "success": True,
            "profile": profile_doc.as_dict()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        } 