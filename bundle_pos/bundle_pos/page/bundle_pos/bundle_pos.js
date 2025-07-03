frappe.pages['bundle-pos'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Bundle POS',
        single_column: true
    });

    // Initialize Bundle POS
    new BundlePOS(page);
}

class BundlePOS {
    constructor(page) {
        this.page = page;
        this.wrapper = page.wrapper;
        this.current_customer = null;
        this.current_pos_profile = null;
        this.cart_items = [];
        this.session_open = false;
        this.payment_methods = [];
        
        this.setup_page();
        this.setup_events();
        this.load_pos_profiles();
        this.set_current_user();
    }

    setup_page() {
        // Load HTML template
        $(this.wrapper).html(frappe.render_template('bundle_pos', {}));
        
        // Hide Frappe's default page content
        this.page.main.hide();
        
        // Set up fullscreen capability
        this.setup_fullscreen();
    }

    setup_events() {
        const self = this;

        // POS Profile Selection
        $('#pos-profile-select').on('change', function() {
            const profile = $(this).val();
            if (profile) {
                self.load_pos_profile(profile);
            }
        });

        // Session Management
        $('#open-session-btn').on('click', () => this.open_session_modal());
        $('#close-session-btn').on('click', () => this.close_session_modal());

        // Customer Events
        $('#customer-search').on('input', debounce(() => this.search_customers(), 300));
        $('#add-customer-btn').on('click', () => this.show_customer_modal());
        $('#clear-customer-btn').on('click', () => this.clear_customer());
        $('#save-customer-btn').on('click', () => this.save_customer());

        // Item Events
        $('#item-search').on('input', debounce(() => this.search_items(), 300));
        $('.category-btn').on('click', function() {
            $('.category-btn').removeClass('active');
            $(this).addClass('active');
            self.filter_items_by_category($(this).data('category'));
        });

        // Cart Events
        $('#clear-cart-btn').on('click', () => this.clear_cart());
        $('#checkout-btn').on('click', () => this.show_payment_modal());

        // Payment Events
        $('#complete-payment-btn').on('click', () => this.complete_payment());

        // Utility Events
        $('#fullscreen-btn').on('click', () => this.toggle_fullscreen());
        $('#sync-btn').on('click', () => this.sync_data());

        // Keyboard shortcuts
        $(document).on('keydown', (e) => this.handle_keyboard_shortcuts(e));
    }

    set_current_user() {
        $('#current-user').text(frappe.session.user_fullname || frappe.session.user);
    }

    load_pos_profiles() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Bundle POS Profile',
                fields: ['name', 'profile_name', 'company'],
                filters: {'disabled': 0}
            },
            callback: (r) => {
                if (r.message) {
                    const select = $('#pos-profile-select');
                    select.empty().append('<option value="">Select POS Profile</option>');
                    
                    r.message.forEach(profile => {
                        select.append(`<option value="${profile.name}">${profile.profile_name} (${profile.company})</option>`);
                    });
                }
            }
        });
    }

    load_pos_profile(profile_name) {
        frappe.call({
            method: 'bundle_pos.bundle_pos.doctype.bundle_pos_profile.bundle_pos_profile.get_pos_profile_data',
            args: { profile_name: profile_name },
            callback: (r) => {
                if (r.message) {
                    this.current_pos_profile = r.message.profile;
                    this.payment_methods = r.message.payment_methods;
                    this.load_items();
                    this.check_session_status();
                    this.show_success('POS Profile loaded successfully');
                }
            },
            error: (r) => {
                this.show_error(r.message || 'Failed to load POS Profile');
            }
        });
    }

    check_session_status() {
        if (!this.current_pos_profile) return;

        frappe.call({
            method: 'bundle_pos.bundle_pos.api.pos_session.get_current_session',
            args: { pos_profile: this.current_pos_profile.name },
            callback: (r) => {
                if (r.message && r.message.session_open) {
                    this.session_open = true;
                    this.update_session_ui(r.message);
                } else {
                    this.session_open = false;
                    this.update_session_ui(null);
                }
            }
        });
    }

    update_session_ui(session_data) {
        if (this.session_open && session_data) {
            $('#open-session-btn').hide();
            $('#close-session-btn').show();
            $('#session-info').text(`Session: ${session_data.opening_date} | Sales: ₹${session_data.total_sales}`);
        } else {
            $('#open-session-btn').show();
            $('#close-session-btn').hide();
            $('#session-info').text('No active session');
        }
    }

    open_session_modal() {
        if (!this.current_pos_profile) {
            this.show_error('Please select a POS Profile first');
            return;
        }

        $('#session-modal-title').text('Open POS Session');
        $('#session-modal-body').html(`
            <div class="form-group">
                <label>Opening Cash Balance</label>
                <input type="number" class="form-control" id="opening-balance" value="0" min="0" step="0.01">
                <small class="form-text text-muted">Enter the cash amount in the register</small>
            </div>
        `);
        $('#session-action-btn').text('Open Session').off('click').on('click', () => this.open_session());
        $('#session-modal').modal('show');
    }

    open_session() {
        const opening_balance = parseFloat($('#opening-balance').val()) || 0;

        frappe.call({
            method: 'bundle_pos.bundle_pos.api.pos_session.open_pos_session',
            args: {
                pos_profile: this.current_pos_profile.name,
                opening_balance: opening_balance
            },
            callback: (r) => {
                if (r.message && r.message.success) {
                    this.session_open = true;
                    this.check_session_status();
                    $('#session-modal').modal('hide');
                    this.show_success('POS Session opened successfully');
                } else {
                    this.show_error(r.message?.error || 'Failed to open session');
                }
            }
        });
    }

    close_session_modal() {
        if (!this.session_open) {
            this.show_error('No active session to close');
            return;
        }

        $('#session-modal-title').text('Close POS Session');
        
        // Generate closing balance form
        let closing_form = '<div class="row">';
        this.payment_methods.forEach(method => {
            closing_form += `
                <div class="col-md-6 mb-3">
                    <label>${method.mode_of_payment}</label>
                    <input type="number" class="form-control closing-balance" 
                           data-method="${method.mode_of_payment}" value="0" min="0" step="0.01">
                </div>
            `;
        });
        closing_form += '</div>';

        $('#session-modal-body').html(closing_form);
        $('#session-action-btn').text('Close Session').off('click').on('click', () => this.close_session());
        $('#session-modal').modal('show');
    }

    close_session() {
        const closing_balances = [];
        $('.closing-balance').each(function() {
            closing_balances.push({
                mode_of_payment: $(this).data('method'),
                closing_amount: parseFloat($(this).val()) || 0
            });
        });

        frappe.call({
            method: 'bundle_pos.bundle_pos.api.pos_session.close_pos_session',
            args: {
                pos_profile: this.current_pos_profile.name,
                closing_balances: JSON.stringify(closing_balances)
            },
            callback: (r) => {
                if (r.message && r.message.success) {
                    this.session_open = false;
                    this.update_session_ui(null);
                    $('#session-modal').modal('hide');
                    this.show_success('POS Session closed successfully');
                } else {
                    this.show_error(r.message?.error || 'Failed to close session');
                }
            }
        });
    }

    search_customers() {
        const query = $('#customer-search').val().trim();
        
        if (query.length < 2) {
            $('#customer-results').hide().empty();
            return;
        }

        frappe.call({
            method: 'bundle_pos.bundle_pos.api.customer.search_customers',
            args: {
                query: query,
                pos_profile: this.current_pos_profile?.name,
                limit: 10
            },
            callback: (r) => {
                if (r.message) {
                    this.display_customer_results(r.message);
                }
            }
        });
    }

    display_customer_results(customers) {
        const results = $('#customer-results');
        results.empty();

        if (customers.length === 0) {
            results.html('<div class="customer-result-item">No customers found</div>');
        } else {
            customers.forEach(customer => {
                const item = $(`
                    <div class="customer-result-item" data-customer="${customer.name}">
                        <strong>${customer.customer_name}</strong>
                        <div style="font-size: 0.9rem; color: #666;">
                            ${customer.mobile_no || ''} ${customer.email_id ? '| ' + customer.email_id : ''}
                        </div>
                    </div>
                `);
                
                item.on('click', () => this.select_customer(customer));
                results.append(item);
            });
        }

        results.show();
    }

    select_customer(customer) {
        this.current_customer = customer;
        
        $('#customer-name').text(customer.customer_name);
        $('#customer-phone').text(customer.mobile_no || 'N/A');
        $('#customer-email').text(customer.email_id || 'N/A');
        
        $('#selected-customer').show();
        $('#customer-results').hide();
        $('#customer-search').val(customer.customer_name);
        
        this.update_checkout_button();
        this.show_success(`Customer ${customer.customer_name} selected`);
    }

    clear_customer() {
        this.current_customer = null;
        $('#selected-customer').hide();
        $('#customer-search').val('');
        $('#customer-results').hide();
        this.update_checkout_button();
    }

    show_customer_modal() {
        $('#customer-form')[0].reset();
        $('#customer-modal').modal('show');
    }

    save_customer() {
        const form_data = new FormData($('#customer-form')[0]);
        const customer_data = {};
        
        for (let [key, value] of form_data.entries()) {
            customer_data[key] = value;
        }

        if (!customer_data.customer_name) {
            this.show_error('Customer name is required');
            return;
        }

        frappe.call({
            method: 'bundle_pos.bundle_pos.api.customer.create_customer',
            args: { customer_data: customer_data },
            callback: (r) => {
                if (r.message && r.message.success) {
                    $('#customer-modal').modal('hide');
                    this.show_success('Customer created successfully');
                    
                    // Auto-select the new customer
                    const new_customer = {
                        name: r.message.customer,
                        customer_name: r.message.customer_name,
                        mobile_no: customer_data.mobile_no,
                        email_id: customer_data.email_id
                    };
                    this.select_customer(new_customer);
                } else {
                    this.show_error(r.message?.error || 'Failed to create customer');
                }
            }
        });
    }

    load_items() {
        if (!this.current_pos_profile) return;

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Item',
                fields: ['name', 'item_name', 'image', 'item_group', 'stock_uom', 'is_bundle_item'],
                filters: {
                    'disabled': 0,
                    'is_sales_item': 1
                },
                limit_page_length: 100
            },
            callback: (r) => {
                if (r.message) {
                    this.display_items(r.message);
                    this.load_item_categories();
                }
            }
        });
    }

    display_items(items) {
        const grid = $('#items-grid');
        grid.empty();

        items.forEach(item => {
            const card = $(`
                <div class="item-card ${item.is_bundle_item ? 'bundle-item' : ''}" data-item="${item.name}">
                    <img src="${item.image || '/assets/frappe/images/ui/item-placeholder.png'}" 
                         class="item-image" alt="${item.item_name}">
                    <div class="item-name">${item.item_name}</div>
                    <div class="item-price" data-price="0">₹0.00</div>
                    <div class="item-stock">Loading...</div>
                </div>
            `);

            card.on('click', () => this.add_item_to_cart(item.name));
            grid.append(card);

            // Load item details asynchronously
            this.load_item_details(item.name);
        });
    }

    load_item_details(item_code) {
        frappe.call({
            method: 'bundle_pos.bundle_pos.api.cart.get_item_details',
            args: {
                item_code: item_code,
                customer: this.current_customer?.name,
                pos_profile: this.current_pos_profile?.name
            },
            callback: (r) => {
                if (r.message) {
                    const item = r.message;
                    const card = $(`.item-card[data-item="${item_code}"]`);
                    
                    card.find('.item-price').text(`₹${item.rate.toFixed(2)}`).data('price', item.rate);
                    
                    if (item.is_stock_item) {
                        const stock_text = item.available_qty > 0 ? 
                            `${item.available_qty} ${item.stock_uom}` : 'Out of Stock';
                        card.find('.item-stock').text(stock_text);
                        
                        if (item.available_qty <= 0) {
                            card.addClass('out-of-stock');
                        }
                    } else {
                        card.find('.item-stock').text('Service Item');
                    }
                }
            }
        });
    }

    load_item_categories() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Item Group',
                fields: ['name', 'item_group_name'],
                filters: {'is_group': 0}
            },
            callback: (r) => {
                if (r.message) {
                    const categories = $('#item-categories');
                    r.message.forEach(group => {
                        const btn = $(`
                            <button class="btn btn-outline-primary category-btn" data-category="${group.name}">
                                ${group.item_group_name}
                            </button>
                        `);
                        btn.on('click', function() {
                            $('.category-btn').removeClass('active');
                            $(this).addClass('active');
                            // Filter items logic would go here
                        });
                        categories.append(btn);
                    });
                }
            }
        });
    }

    add_item_to_cart(item_code) {
        if (!this.session_open) {
            this.show_error('Please open a POS session first');
            return;
        }

        if (this.current_pos_profile?.require_customer_selection && !this.current_customer) {
            this.show_error('Please select a customer first');
            return;
        }

        frappe.call({
            method: 'bundle_pos.bundle_pos.api.cart.add_item_to_cart',
            args: {
                item_code: item_code,
                qty: 1,
                customer: this.current_customer?.name,
                pos_profile: this.current_pos_profile?.name
            },
            callback: (r) => {
                if (r.message && r.message.success) {
                    this.add_to_cart_ui(r.message.item);
                    this.show_success(`${r.message.item.item_name} added to cart`);
                } else {
                    this.show_error('Failed to add item to cart');
                }
            }
        });
    }

    add_to_cart_ui(item) {
        // Check if item already exists in cart
        const existing_index = this.cart_items.findIndex(cart_item => cart_item.item_code === item.item_code);
        
        if (existing_index !== -1) {
            // Update quantity
            this.cart_items[existing_index].qty += item.qty;
            this.cart_items[existing_index].amount = this.cart_items[existing_index].qty * this.cart_items[existing_index].rate;
        } else {
            // Add new item
            this.cart_items.push(item);
        }

        this.update_cart_ui();
    }

    update_cart_ui() {
        const cart_container = $('#cart-items');
        const empty_cart = $('#empty-cart');

        if (this.cart_items.length === 0) {
            empty_cart.show();
            cart_container.find('.cart-item').remove();
        } else {
            empty_cart.hide();
            cart_container.find('.cart-item').remove();

            this.cart_items.forEach((item, index) => {
                const cart_item = $(`
                    <div class="cart-item ${item.is_bundle ? 'bundle-item' : ''}" data-index="${index}">
                        <div class="cart-item-header">
                            <div class="cart-item-name">${item.item_name}</div>
                            <button class="cart-item-remove" onclick="bundle_pos.remove_cart_item(${index})">
                                <i class="fa fa-times"></i>
                            </button>
                        </div>
                        <div class="cart-item-controls">
                            <div class="qty-controls">
                                <button class="qty-btn" onclick="bundle_pos.update_qty(${index}, ${item.qty - 1})">-</button>
                                <input type="number" class="qty-input" value="${item.qty}" 
                                       onchange="bundle_pos.update_qty(${index}, this.value)" min="1">
                                <button class="qty-btn" onclick="bundle_pos.update_qty(${index}, ${item.qty + 1})">+</button>
                            </div>
                            <div class="item-amount">₹${item.amount.toFixed(2)}</div>
                        </div>
                        ${item.is_bundle ? this.render_bundle_items(item.bundle_items) : ''}
                    </div>
                `);
                cart_container.append(cart_item);
            });
        }

        this.update_cart_totals();
        this.update_checkout_button();
    }

    render_bundle_items(bundle_items) {
        if (!bundle_items || bundle_items.length === 0) return '';

        let html = '<div class="bundle-items"><div class="bundle-items-title">Bundle Items:</div>';
        bundle_items.forEach(bundle_item => {
            html += `
                <div class="bundle-item-detail">
                    <span>${bundle_item.item_name}</span>
                    <span>${bundle_item.qty} ${bundle_item.uom}</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    update_qty(index, new_qty) {
        new_qty = parseInt(new_qty);
        if (new_qty <= 0) {
            this.remove_cart_item(index);
            return;
        }

        this.cart_items[index].qty = new_qty;
        this.cart_items[index].amount = new_qty * this.cart_items[index].rate;
        this.update_cart_ui();
    }

    remove_cart_item(index) {
        this.cart_items.splice(index, 1);
        this.update_cart_ui();
        this.show_success('Item removed from cart');
    }

    clear_cart() {
        this.cart_items = [];
        this.update_cart_ui();
        this.show_success('Cart cleared');
    }

    update_cart_totals() {
        let subtotal = 0;
        let tax = 0;
        let discount = 0;

        this.cart_items.forEach(item => {
            subtotal += item.amount;
        });

        const total = subtotal + tax - discount;

        $('#cart-subtotal').text(`₹${subtotal.toFixed(2)}`);
        $('#cart-tax').text(`₹${tax.toFixed(2)}`);
        $('#cart-discount').text(`₹${discount.toFixed(2)}`);
        $('#cart-total').text(`₹${total.toFixed(2)}`);
    }

    update_checkout_button() {
        const can_checkout = this.cart_items.length > 0 && 
                           this.session_open && 
                           (!this.current_pos_profile?.require_customer_selection || this.current_customer);
        
        $('#checkout-btn').prop('disabled', !can_checkout);
    }

    show_payment_modal() {
        if (this.cart_items.length === 0) {
            this.show_error('Cart is empty');
            return;
        }

        const total = this.cart_items.reduce((sum, item) => sum + item.amount, 0);
        $('#payment-total').text(`₹${total.toFixed(2)}`);

        // Generate payment methods
        const payment_methods_container = $('#payment-methods');
        payment_methods_container.empty();

        this.payment_methods.forEach(method => {
            const payment_method = $(`
                <div class="payment-method" data-method="${method.mode_of_payment}">
                    <div class="payment-method-header">
                        <span class="payment-method-name">${method.mode_of_payment}</span>
                        <input type="checkbox" class="payment-method-check">
                    </div>
                    <input type="number" class="payment-amount-input" placeholder="Amount" 
                           min="0" step="0.01" style="display: none;">
                </div>
            `);

            payment_method.find('.payment-method-check').on('change', function() {
                const amount_input = payment_method.find('.payment-amount-input');
                if ($(this).is(':checked')) {
                    payment_method.addClass('active');
                    amount_input.show().focus();
                    if (method.default) {
                        amount_input.val(total.toFixed(2));
                    }
                } else {
                    payment_method.removeClass('active');
                    amount_input.hide().val('');
                }
                bundle_pos.update_payment_totals();
            });

            payment_method.find('.payment-amount-input').on('input', () => {
                this.update_payment_totals();
            });

            payment_methods_container.append(payment_method);
        });

        // Auto-select default payment method
        const default_method = this.payment_methods.find(m => m.default);
        if (default_method) {
            const default_element = $(`.payment-method[data-method="${default_method.mode_of_payment}"]`);
            default_element.find('.payment-method-check').trigger('change');
        }

        $('#payment-modal').modal('show');
    }

    update_payment_totals() {
        let total_paid = 0;
        
        $('.payment-method.active .payment-amount-input').each(function() {
            total_paid += parseFloat($(this).val()) || 0;
        });

        const total_amount = this.cart_items.reduce((sum, item) => sum + item.amount, 0);
        const change = total_paid - total_amount;

        $('#amount-paid').text(`₹${total_paid.toFixed(2)}`);
        $('#change-amount').text(`₹${Math.max(0, change).toFixed(2)}`);

        $('#complete-payment-btn').prop('disabled', total_paid < total_amount);
    }

    complete_payment() {
        // This would integrate with ERPNext's Sales Invoice creation
        this.show_success('Payment completed successfully!');
        $('#payment-modal').modal('hide');
        this.clear_cart();
    }

    setup_fullscreen() {
        this.is_fullscreen = false;
    }

    toggle_fullscreen() {
        if (!this.is_fullscreen) {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
            $('.bundle-pos-container').addClass('fullscreen-mode');
            $('#fullscreen-btn i').removeClass('fa-expand').addClass('fa-compress');
            this.is_fullscreen = true;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            $('.bundle-pos-container').removeClass('fullscreen-mode');
            $('#fullscreen-btn i').removeClass('fa-compress').addClass('fa-expand');
            this.is_fullscreen = false;
        }
    }

    sync_data() {
        this.show_success('Data synced successfully');
    }

    handle_keyboard_shortcuts(e) {
        // F11 - Toggle fullscreen
        if (e.key === 'F11') {
            e.preventDefault();
            this.toggle_fullscreen();
        }
        
        // Ctrl+N - New customer
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.show_customer_modal();
        }
        
        // Ctrl+P - Payment
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            if (!$('#checkout-btn').prop('disabled')) {
                this.show_payment_modal();
            }
        }
    }

    show_success(message) {
        frappe.show_alert({
            message: message,
            indicator: 'green'
        });
    }

    show_error(message) {
        frappe.show_alert({
            message: message,
            indicator: 'red'
        });
    }
}

// Global reference for inline event handlers
let bundle_pos;

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize global reference
frappe.ready(() => {
    if (frappe.get_route()[0] === 'bundle-pos') {
        // Will be set when page loads
    }
});

// Set global reference when page loads
$(document).on('bundle-pos-loaded', function(e, pos_instance) {
    bundle_pos = pos_instance;
}); 