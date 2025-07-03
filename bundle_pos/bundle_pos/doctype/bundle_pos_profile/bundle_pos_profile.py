# -*- coding: utf-8 -*-
# Copyright (c) 2024, Your Company and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe import _

class BundlePOSProfile(Document):
    def validate(self):
        self.validate_company_settings()
        self.validate_accounting_settings()
        self.validate_payment_methods()
        self.validate_bundle_settings()
        
    def validate_company_settings(self):
        """Validate company related settings"""
        if not self.company:
            frappe.throw(_("Company is required"))
            
        if not self.warehouse:
            frappe.throw(_("Warehouse is required"))
            
        if not self.currency:
            # Get default currency from company
            company_currency = frappe.get_cached_value("Company", self.company, "default_currency")
            if company_currency:
                self.currency = company_currency
            else:
                frappe.throw(_("Currency is required"))
                
        # Validate warehouse belongs to company
        warehouse_company = frappe.get_cached_value("Warehouse", self.warehouse, "company")
        if warehouse_company != self.company:
            frappe.throw(_("Warehouse {0} does not belong to company {1}").format(self.warehouse, self.company))
            
    def validate_accounting_settings(self):
        """Validate accounting related settings"""
        if self.income_account:
            income_account_company = frappe.get_cached_value("Account", self.income_account, "company")
            if income_account_company != self.company:
                frappe.throw(_("Income Account {0} does not belong to company {1}").format(self.income_account, self.company))
                
        if self.expense_account:
            expense_account_company = frappe.get_cached_value("Account", self.expense_account, "company")
            if expense_account_company != self.company:
                frappe.throw(_("Expense Account {0} does not belong to company {1}").format(self.expense_account, self.company))
                
        if self.write_off_account:
            write_off_account_company = frappe.get_cached_value("Account", self.write_off_account, "company")
            if write_off_account_company != self.company:
                frappe.throw(_("Write Off Account {0} does not belong to company {1}").format(self.write_off_account, self.company))
                
    def validate_payment_methods(self):
        """Validate payment methods"""
        if not self.payments:
            frappe.throw(_("At least one payment method is required"))
            
        payment_methods = []
        for payment in self.payments:
            if payment.mode_of_payment in payment_methods:
                frappe.throw(_("Payment method {0} is duplicated").format(payment.mode_of_payment))
            payment_methods.append(payment.mode_of_payment)
            
    def validate_bundle_settings(self):
        """Validate bundle specific settings"""
        if self.allow_bundle_discount and self.max_bundle_discount_percentage:
            if self.max_bundle_discount_percentage < 0 or self.max_bundle_discount_percentage > 100:
                frappe.throw(_("Max Bundle Discount Percentage should be between 0 and 100"))
                
    def get_payment_methods(self):
        """Get configured payment methods for this profile"""
        payment_methods = []
        for payment in self.payments:
            payment_methods.append({
                "mode_of_payment": payment.mode_of_payment,
                "account": payment.account,
                "default": payment.default
            })
        return payment_methods
        
    def get_applicable_item_groups(self):
        """Get item groups applicable for this POS profile"""
        if not self.item_groups:
            return []
        return [item_group.item_group for item_group in self.item_groups]
        
    def get_applicable_customer_groups(self):
        """Get customer groups applicable for this POS profile"""
        if not self.customer_groups:
            return []
        return [customer_group.customer_group for customer_group in self.customer_groups]
        
    def get_bundle_categories(self):
        """Get bundle categories for this POS profile"""
        if not self.bundle_categories:
            return []
        return [category.category for category in self.bundle_categories]
        
    def is_user_allowed(self, user=None):
        """Check if user is allowed to use this POS profile"""
        if not user:
            user = frappe.session.user
            
        if not self.applicable_for_users:
            return True
            
        allowed_users = [pos_user.user for pos_user in self.applicable_for_users]
        return user in allowed_users
        
@frappe.whitelist()
def get_pos_profile_data(profile_name):
    """Get POS profile data for frontend"""
    profile = frappe.get_doc("Bundle POS Profile", profile_name)
    
    if not profile.is_user_allowed():
        frappe.throw(_("You are not allowed to use this POS Profile"))
        
    return {
        "profile": profile.as_dict(),
        "payment_methods": profile.get_payment_methods(),
        "item_groups": profile.get_applicable_item_groups(),
        "customer_groups": profile.get_applicable_customer_groups(),
        "bundle_categories": profile.get_bundle_categories()
    } 