# Bundle POS

**Dynamic Bundle Point of Sale System for ERPNext**

A comprehensive POS solution with dynamic bundle management capabilities, designed to integrate seamlessly with ERPNext's accounting and inventory modules.

## 🚀 Features

### Core POS Functionality
- ✅ **Customer Search** - Search by name, phone, and email
- ✅ **Cart Management** - Add/remove items with real-time validation
- ✅ **Customer Validation** - Mandatory customer selection before cart operations
- ✅ **POS Sessions** - Opening and closing entries with cash reconciliation
- ✅ **Full Integration** - Complete accounting and inventory integration

### Advanced Features
- 🎁 **Bundle Support** - Dynamic bundle items with quantity multipliers
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🖥️ **Full-Screen Mode** - Optimized for POS hardware
- 💰 **Multiple Payments** - Support for various payment methods
- 📊 **Real-time Stock** - Live inventory validation
- 🔄 **Offline Support** - Basic offline capability with sync

## 📋 Requirements

- ERPNext v13+ (recommended v14+)
- Frappe Framework
- Python 3.6+

## 🛠️ Installation

### Method 1: From GitHub (Recommended)
```bash
# Get the app
bench get-app https://github.com/poparab/bundle_pos.git

# Install on your site
bench --site [your-site-name] install-app bundle_pos

# Restart and build
bench restart
bench build
```

### Method 2: Local Development
```bash
# Clone the repository
git clone https://github.com/poparab/bundle_pos.git
cd bundle_pos

# Install in development mode
bench get-app /path/to/bundle_pos
bench --site [your-site-name] install-app bundle_pos
```

## ⚙️ Setup

### 1. Create Bundle POS Profile
1. Go to **Bundle POS > Bundle POS Profile**
2. Create a new profile with:
   - Company and Warehouse
   - Payment Methods
   - Customer Settings
   - Bundle Configurations

### 2. Configure Items
- Mark items as bundle items if needed
- Set up item prices and stock levels
- Configure item groups and categories

### 3. Set User Permissions
- Assign **POS User** role for cashiers
- Assign **POS Manager** role for supervisors
- Configure profile access for specific users

## 🎯 Usage

### Opening a POS Session
1. Navigate to `/app/bundle-pos`
2. Select your POS Profile
3. Click **Open Session**
4. Enter opening cash balance
5. Start selling!

### Making a Sale
1. **Select Customer** - Search by name/phone/email or create new
2. **Add Items** - Click items or scan barcodes
3. **Review Cart** - Adjust quantities as needed
4. **Checkout** - Select payment methods
5. **Complete** - Print receipt and finish

### Closing Session
1. Click **Close Session**
2. Enter actual cash counts for each payment method
3. Review differences and reconcile
4. Submit closing entry

## 🏗️ Architecture

```
bundle_pos/
├── bundle_pos/
│   ├── doctype/
│   │   ├── bundle_pos_profile/          # Main POS configuration
│   │   └── bundle_pos_payment_method/   # Payment methods
│   ├── page/
│   │   └── bundle_pos/                  # Main POS interface
│   ├── api/
│   │   ├── customer.py                  # Customer management
│   │   ├── cart.py                      # Cart operations
│   │   └── pos_session.py               # Session management
│   └── public/
│       ├── css/                         # Styling
│       └── js/                          # JavaScript integration
```

## 🔧 Configuration

### POS Profile Settings
- **Company Settings** - Company, warehouse, currency
- **Customer Settings** - Search fields, default customer, groups
- **Payment Methods** - Cash, card, digital payments
- **Bundle Settings** - Price calculation, discounts
- **Accounting** - Income, expense, write-off accounts

### Bundle Item Configuration
- Mark items as bundle items
- Configure bundle components
- Set pricing rules and discounts

## 📱 Keyboard Shortcuts

- **F11** - Toggle fullscreen
- **Ctrl+N** - Add new customer
- **Ctrl+P** - Open payment modal
- **Ctrl+Shift+P** - Open Bundle POS (from anywhere in ERPNext)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/poparab/bundle_pos/issues)
- **Documentation**: Check the `FEATURES_ROADMAP.md` for detailed development plans
- **ERPNext Community**: [Discuss on ERPNext Forum](https://discuss.erpnext.com)

## 🎯 Roadmap

See [FEATURES_ROADMAP.md](FEATURES_ROADMAP.md) for detailed development phases and upcoming features.

---

**Made with ❤️ for the ERPNext Community** 