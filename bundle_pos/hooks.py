# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "bundle_pos"
app_title = "Bundle POS"
app_publisher = "Your Company"
app_description = "Dynamic Bundle Point of Sale System for ERPNext"
app_icon = "octicon octicon-package"
app_color = "blue"
app_email = "info@yourcompany.com"
app_license = "MIT"
app_version = app_version

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/bundle_pos/css/bundle_pos.css"
app_include_js = "/assets/bundle_pos/js/bundle_pos.js"

# include js, css files in header of web template
web_include_css = "/assets/bundle_pos/css/bundle_pos.css"
web_include_js = "/assets/bundle_pos/js/bundle_pos.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "bundle_pos/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Sales Invoice": "public/js/sales_invoice.js",
    "POS Profile": "public/js/pos_profile.js",
    "Item": "public/js/item.js",
    "Customer": "public/js/customer.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "bundle_pos.install.before_install"
# after_install = "bundle_pos.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "bundle_pos.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
#	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
#	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
#	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "Sales Invoice": {
        "validate": "bundle_pos.bundle_pos.doctype.bundle_pos_invoice.bundle_pos_invoice.validate_bundle_invoice",
        "on_submit": "bundle_pos.bundle_pos.doctype.bundle_pos_invoice.bundle_pos_invoice.on_submit_bundle_invoice",
        "on_cancel": "bundle_pos.bundle_pos.doctype.bundle_pos_invoice.bundle_pos_invoice.on_cancel_bundle_invoice"
    },
    "POS Opening Entry": {
        "validate": "bundle_pos.bundle_pos.api.pos_opening.validate_pos_opening"
    },
    "POS Closing Entry": {
        "validate": "bundle_pos.bundle_pos.api.pos_closing.validate_pos_closing"
    }
}

# Scheduled Tasks
# ---------------

scheduler_events = {
    "cron": {
        "0/15 * * * *": [
            "bundle_pos.bundle_pos.api.sync.sync_offline_invoices"
        ]
    },
    "daily": [
        "bundle_pos.bundle_pos.api.reports.generate_daily_pos_report"
    ]
}

# Testing
# -------

# before_tests = "bundle_pos.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
#	"frappe.desk.doctype.event.event.get_events": "bundle_pos.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
#	"Task": "bundle_pos.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

user_data_fields = [
    {
        "doctype": "{doctype_1}",
        "filter_by": "{filter_by}",
        "redact_fields": ["{field_1}", "{field_2}"],
        "partial": 1,
    },
    {
        "doctype": "{doctype_2}",
        "filter_by": "{filter_by}",
        "strict": False,
    },
    {
        "doctype": "{doctype_3}",
        "filter_by": "{filter_by}",
        "partial": 1,
    },
    {
        "doctype": "{doctype_4}",
        "filter_by": "{filter_by}",
        "partial": 1,
    }
]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
#	"bundle_pos.auth.validate"
# ]

# Translation
# --------------------------------

# Make link fields search translated document names for these DocTypes
# Recommended only for DocTypes which have limited documents with untranslated names
# For example: Role, Gender, etc.
# translated_search_doctypes = []

# Website
# --------

# website_route_rules = [
#     {"from_route": "/bundle-pos/<path:app_path>", "to_route": "bundle-pos"},
# ]

# API Endpoints
# -------------

# Whitelisted API methods
# These methods can be called via REST API
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [
            [
                "name", "in", [
                    "Item-is_bundle_item",
                    "Item-bundle_items",
                    "Sales Invoice Item-bundle_parent",
                    "Sales Invoice Item-bundle_qty_multiplier"
                ]
            ]
        ]
    }
] 