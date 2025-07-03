// Bundle POS Global JavaScript

// Extend ERPNext Customer DocType
if (cur_frm && cur_frm.doctype === "Customer") {
    cur_frm.add_custom_button(__("Open in Bundle POS"), function() {
        frappe.set_route("bundle-pos", {customer: cur_frm.doc.name});
    }, __("Actions"));
}

// Extend ERPNext Item DocType
if (cur_frm && cur_frm.doctype === "Item") {
    cur_frm.add_custom_button(__("Add to Bundle POS"), function() {
        frappe.set_route("bundle-pos", {item: cur_frm.doc.name});
    }, __("Actions"));
}

// Bundle POS Utilities
window.BundlePOSUtils = {
    // Format currency
    format_currency: function(amount, currency = 'INR') {
        return format_currency(amount, currency);
    },
    
    // Show loading
    show_loading: function(message = 'Loading...') {
        if (!$('.loading-overlay').length) {
            $('body').append(`
                <div class="loading-overlay">
                    <div class="text-center">
                        <div class="loading-spinner"></div>
                        <div class="mt-2 text-white">${message}</div>
                    </div>
                </div>
            `);
        }
    },
    
    // Hide loading
    hide_loading: function() {
        $('.loading-overlay').remove();
    },
    
    // Validate customer selection
    validate_customer_required: function(pos_profile, customer) {
        if (!pos_profile) return false;
        
        return frappe.call({
            method: 'bundle_pos.bundle_pos.doctype.bundle_pos_profile.bundle_pos_profile.get_pos_profile_data',
            args: { profile_name: pos_profile },
            async: false,
            callback: function(r) {
                if (r.message && r.message.profile.require_customer_selection && !customer) {
                    frappe.throw(__('Please select a customer before proceeding'));
                }
            }
        });
    },
    
    // Get item bundle details
    get_bundle_details: function(item_code, callback) {
        frappe.call({
            method: 'bundle_pos.bundle_pos.api.cart.get_item_details',
            args: { item_code: item_code },
            callback: function(r) {
                if (r.message && callback) {
                    callback(r.message);
                }
            }
        });
    },
    
    // Search customers
    search_customers: function(query, pos_profile, callback) {
        if (!query || query.length < 2) {
            if (callback) callback([]);
            return;
        }
        
        frappe.call({
            method: 'bundle_pos.bundle_pos.api.customer.search_customers',
            args: {
                query: query,
                pos_profile: pos_profile,
                limit: 10
            },
            callback: function(r) {
                if (r.message && callback) {
                    callback(r.message);
                }
            }
        });
    },
    
    // Create quick customer
    create_quick_customer: function(customer_data, callback) {
        frappe.call({
            method: 'bundle_pos.bundle_pos.api.customer.create_customer',
            args: { customer_data: customer_data },
            callback: function(r) {
                if (r.message && callback) {
                    callback(r.message);
                }
            }
        });
    },
    
    // Barcode scanner integration
    init_barcode_scanner: function(callback) {
        // Initialize barcode scanner if available
        if (window.ZXing) {
            // ZXing barcode scanner integration
            const codeReader = new ZXing.BrowserBarcodeReader();
            codeReader.decodeFromInputVideoDevice(undefined, 'barcode-scanner-video')
                .then(result => {
                    if (callback) callback(result.text);
                })
                .catch(err => console.error(err));
        }
    },
    
    // Print receipt
    print_receipt: function(invoice_name) {
        frappe.call({
            method: 'frappe.utils.print_format.download_pdf',
            args: {
                doctype: 'Sales Invoice',
                name: invoice_name,
                format: 'POS Receipt',
                no_letterhead: 1
            },
            callback: function(r) {
                if (r.message) {
                    // Open print dialog
                    window.open(r.message.pdf_url, '_blank');
                }
            }
        });
    },
    
    // Sync offline data
    sync_offline_data: function() {
        const offline_data = localStorage.getItem('bundle_pos_offline_data');
        if (offline_data) {
            const data = JSON.parse(offline_data);
            
            frappe.call({
                method: 'bundle_pos.bundle_pos.api.sync.sync_offline_invoices',
                args: { offline_data: data },
                callback: function(r) {
                    if (r.message && r.message.success) {
                        localStorage.removeItem('bundle_pos_offline_data');
                        frappe.show_alert({
                            message: __('Offline data synced successfully'),
                            indicator: 'green'
                        });
                    }
                }
            });
        }
    },
    
    // Check network status
    check_network_status: function() {
        return navigator.onLine;
    },
    
    // Save offline data
    save_offline_data: function(data) {
        if (!this.check_network_status()) {
            let offline_data = localStorage.getItem('bundle_pos_offline_data');
            offline_data = offline_data ? JSON.parse(offline_data) : [];
            offline_data.push(data);
            localStorage.setItem('bundle_pos_offline_data', JSON.stringify(offline_data));
            
            frappe.show_alert({
                message: __('Data saved offline. Will sync when online.'),
                indicator: 'orange'
            });
        }
    }
};

// Network status monitoring
window.addEventListener('online', function() {
    frappe.show_alert({
        message: __('Connection restored. Syncing data...'),
        indicator: 'green'
    });
    BundlePOSUtils.sync_offline_data();
});

window.addEventListener('offline', function() {
    frappe.show_alert({
        message: __('Connection lost. Working in offline mode.'),
        indicator: 'orange'
    });
});

// Auto-sync offline data on page load
$(document).ready(function() {
    if (BundlePOSUtils.check_network_status()) {
        BundlePOSUtils.sync_offline_data();
    }
});

// Bundle POS Quick Actions
frappe.ui.toolbar.add_dropdown_button("Bundle POS", [
    {
        label: __("Open Bundle POS"),
        action: function() {
            frappe.set_route("bundle-pos");
        }
    },
    {
        label: __("POS Profiles"),
        action: function() {
            frappe.set_route("List", "Bundle POS Profile");
        }
    },
    {
        label: __("POS Reports"),
        action: function() {
            frappe.set_route("query-report", "Bundle POS Sales Report");
        }
    }
]);

// Keyboard shortcuts for Bundle POS
$(document).on('keydown', function(e) {
    // Ctrl + Shift + P - Open Bundle POS
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        frappe.set_route("bundle-pos");
    }
});

// Bundle POS Integration with Sales Invoice
frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        if (frm.doc.is_pos && frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Reprint Receipt'), function() {
                BundlePOSUtils.print_receipt(frm.doc.name);
            }, __('Actions'));
            
            frm.add_custom_button(__('Open in Bundle POS'), function() {
                frappe.set_route("bundle-pos", {invoice: frm.doc.name});
            }, __('Actions'));
        }
    }
});

// Bundle POS Integration with Customer
frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            frm.add_custom_button(__('Create POS Invoice'), function() {
                frappe.set_route("bundle-pos", {customer: frm.doc.name});
            }, __('Create'));
        }
    }
});

// Bundle POS Integration with Item
frappe.ui.form.on('Item', {
    refresh: function(frm) {
        if (frm.doc.is_sales_item && !frm.doc.__islocal) {
            frm.add_custom_button(__('Add to POS Cart'), function() {
                frappe.set_route("bundle-pos", {item: frm.doc.name});
            }, __('Actions'));
            
            if (frm.doc.is_bundle_item) {
                frm.add_custom_button(__('View Bundle Items'), function() {
                    BundlePOSUtils.get_bundle_details(frm.doc.name, function(data) {
                        if (data.bundle_items && data.bundle_items.length > 0) {
                            let message = '<h5>Bundle Items:</h5><ul>';
                            data.bundle_items.forEach(item => {
                                message += `<li>${item.item_name} - ${item.qty} ${item.uom}</li>`;
                            });
                            message += '</ul>';
                            
                            frappe.msgprint({
                                title: __('Bundle Items'),
                                message: message
                            });
                        }
                    });
                }, __('Bundle'));
            }
        }
    }
});

// Custom field additions for bundle functionality
frappe.ui.form.on('Item', {
    onload: function(frm) {
        // Add bundle-specific fields if not already added
        if (!frm.fields_dict.is_bundle_item) {
            frm.add_custom_button(__('Make Bundle Item'), function() {
                frappe.confirm(
                    __('This will mark the item as a bundle item. Continue?'),
                    function() {
                        frm.set_value('is_bundle_item', 1);
                        frm.save();
                    }
                );
            });
        }
    }
});

// POS Profile enhancements
frappe.ui.form.on('POS Profile', {
    refresh: function(frm) {
        if (!frm.doc.__islocal) {
            frm.add_custom_button(__('Open Bundle POS'), function() {
                frappe.set_route("bundle-pos", {pos_profile: frm.doc.name});
            }, __('Actions'));
        }
    }
});

// Bundle POS Dashboard Integration
if (frappe.pages && frappe.pages['dashboard']) {
    // Add Bundle POS widgets to dashboard
    frappe.dashboard.add_widget({
        title: __('Bundle POS Quick Actions'),
        template: `
            <div class="bundle-pos-dashboard-widget">
                <div class="row">
                    <div class="col-md-4">
                        <button class="btn btn-primary btn-sm btn-block" onclick="frappe.set_route('bundle-pos')">
                            <i class="fa fa-shopping-cart"></i> Open POS
                        </button>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-info btn-sm btn-block" onclick="frappe.set_route('List', 'Bundle POS Profile')">
                            <i class="fa fa-cog"></i> POS Profiles
                        </button>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-success btn-sm btn-block" onclick="frappe.set_route('query-report', 'Bundle POS Sales Report')">
                            <i class="fa fa-bar-chart"></i> Reports
                        </button>
                    </div>
                </div>
            </div>
        `
    });
} 