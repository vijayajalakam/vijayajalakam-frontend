import {
    LayoutDashboard, FileText, UserCog, Users, 
    Package, Landmark, BarChart3, Settings, MessageSquare, Eye, Clock, Bell
} from 'lucide-react';

export const AVAILABLE_PERMISSIONS = [
    {
        key: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        description: 'Access to the main dashboard and overview',
        modules: [] // Flat, no deep permissions needed
    },
    {
        key: 'chatAssistant',
        label: 'Chat Assistant',
        icon: MessageSquare,
        description: 'Access to AI Chat Assistant',
        modules: [] // Flat
    },
    {
        key: 'dataVisibility',
        label: 'Data Visibility for Staff',
        icon: Eye,
        description: 'View all stock and account data',
        modules: [] // Flat
    },
    {
        key: 'notifications',
        label: 'Notifications',
        icon: Bell,
        description: 'Manage and track shop notifications',
        modules: [
            {
                key: 'general',
                label: 'General Notifications',
                actions: [
                    { key: 'view', label: 'View Notifications' },
                    { key: 'delete', label: 'Delete Notification' },
                    { key: 'cancel', label: 'Cancel Broadcast' }
                ]
            }
        ]
    },
    {
        key: 'invoice',
        label: 'Invoice',
        icon: FileText,
        description: 'POS Management and Invoicing',
        modules: [
            {
                key: 'services',
                label: 'POS Services',
                actions: [
                    { key: 'view', label: 'View' },
                    { key: 'add', label: 'Checkout' }
                ]
            },
            {
                key: 'products',
                label: 'POS Products',
                actions: [
                    { key: 'view', label: 'View' },
                    { key: 'add', label: 'Checkout' }
                ]
            },
            {
                key: 'manage',
                label: 'Invoice Management',
                actions: [
                    { key: 'view', label: 'View Invoices' },
                    { key: 'add', label: 'Create Invoice' },
                    { key: 'edit', label: 'Edit Invoice' },
                    { key: 'delete', label: 'Delete/Void Invoice' },
                    { key: 'edit_price', label: 'Edit Item Price' }
                ]
            }
        ]
    },

    {
        key: 'crm',
        label: 'Buyer',
        icon: Users,
        description: 'Buyer Management',
        modules: [
            {
                key: 'customers',
                label: 'Buyers',
                actions: [
                    { key: 'view', label: 'View Buyers' },
                    { key: 'add', label: 'Add Buyer' },
                    { key: 'edit', label: 'Edit Buyer' },
                    { key: 'delete', label: 'Delete Buyer' }
                ]
            },
            {
                key: 'customer_group',
                label: 'Buyer Group',
                actions: [
                    { key: 'view', label: 'View Groups' },
                    { key: 'add', label: 'Add Group' },
                    { key: 'edit', label: 'Edit Group' },
                    { key: 'delete', label: 'Delete Group' }
                ]
            },
            {
                key: 'loyalty_points',
                label: 'Loyalty Points',
                actions: [
                    { key: 'view', label: 'View Loyalty Points' },
                    { key: 'add', label: 'Add Loyalty Points' },
                    { key: 'edit', label: 'Edit Loyalty Points' },
                    { key: 'delete', label: 'Delete Loyalty Points' }
                ]
            }
        ]
    },

    {
        key: 'stock',
        label: 'Stock',
        icon: Package,
        description: 'Stock, Purchases and Products Management',
        modules: [
            {
                key: 'products',
                label: 'Products',
                actions: [
                    { key: 'view', label: 'View Products' },
                    { key: 'add', label: 'Add Product' },
                    { key: 'edit', label: 'Edit Product' },
                    { key: 'delete', label: 'Delete Product' },
                    { key: 'status', label: 'Toggle Status' },
                    { key: 'sale_status', label: 'Toggle Sale Status' },
                    { key: 'image', label: 'AI Image Generation' }
                ]
            },
            {
                key: 'purchase_orders',
                label: 'Purchase Orders',
                actions: [
                    { key: 'view', label: 'View Orders' },
                    { key: 'add', label: 'Add Order' },
                    { key: 'edit', label: 'Edit Order' },
                    { key: 'delete', label: 'Delete Order' },
                    { key: 'convert', label: 'Convert Order' }
                ]
            },
            {
                key: 'purchase_invoices',
                label: 'Purchase Entry',
                actions: [
                    { key: 'view', label: 'View Entries' },
                    { key: 'add', label: 'Add Entry' },
                    { key: 'edit', label: 'Edit Entry' },
                    { key: 'delete', label: 'Delete Entry' }
                ]
            },
            {
                key: 'purchase_returns',
                label: 'Purchase Returns',
                actions: [
                    { key: 'view', label: 'View Returns' },
                    { key: 'add', label: 'Add Return' },
                    { key: 'edit', label: 'Edit Return' },
                    { key: 'delete', label: 'Delete Return' }
                ]
            },

            {
                key: 'damage_entry',
                label: 'Damage Books',
                actions: [
                    { key: 'view', label: 'View Records' },
                    { key: 'add', label: 'Record Damage Books' },
                    { key: 'edit', label: 'Edit Damage Books' },
                    { key: 'delete', label: 'Delete Damage Books' }
                ]
            },
            {
                key: 'consumption_entry',
                label: 'Consumption Books',
                actions: [
                    { key: 'view', label: 'View Records' },
                    { key: 'add', label: 'Record Consumption Books' },
                    { key: 'edit', label: 'Edit Consumption Books' },
                    { key: 'delete', label: 'Delete Consumption Books' }
                ]
            },
            {
                key: 'stock_adjustment',
                label: 'Adjust Books',
                actions: [
                    { key: 'view', label: 'View Adjust Books' },
                    { key: 'add', label: 'New Adjust Books' },
                    { key: 'edit', label: 'Edit Adjust Books' },
                    { key: 'delete', label: 'Delete Adjust Books' }
                ]
            }
        ]
    },
    {
        key: 'hrm',
        label: 'Staff',
        icon: UserCog,
        description: 'Staff Management and payroll',
        modules: [
            {
                key: 'staff',
                label: 'Staff Management',
                actions: [
                    { key: 'view', label: 'View Staff' },
                    { key: 'add', label: 'Add Staff' },
                    { key: 'edit', label: 'Edit Staff' },
                    { key: 'delete', label: 'Delete Staff' }
                ]
            },
            {
                key: 'attendance',
                label: 'Attendance Management',
                actions: [
                    { key: 'view', label: 'View Attendance' },
                    { key: 'add', label: 'Add Attendance' },
                    { key: 'edit', label: 'Edit Attendance' },
                    { key: 'delete', label: 'Delete Attendance' }
                ]
            },
            {
                key: 'payroll',
                label: 'Payroll Management',
                actions: [
                    { key: 'view', label: 'View Payroll' },
                    { key: 'process', label: 'Process Payroll' }
                ]
            }
        ]
    },
    {
        key: 'accounts',
        label: 'Accounts',
        icon: Landmark,
        description: 'Financial accounting and ledgers',
        modules: [
            {
                key: 'coa',
                label: 'Chart of Accounts',
                actions: [
                    { key: 'view', label: 'View Chart' },
                    { key: 'add', label: 'Create Account' },
                    { key: 'edit', label: 'Edit Account' },
                    { key: 'delete', label: 'Delete Account' }
                ]
            },
            {
                key: 'receipts',
                label: 'Receipts',
                actions: [
                    { key: 'view', label: 'View Receipts' },
                    { key: 'add', label: 'Add Receipt' },
                    { key: 'edit', label: 'Edit Receipt' },
                    { key: 'delete', label: 'Delete Receipt' },
                    { key: 'print', label: 'Print/Export' }
                ]
            },
            {
                key: 'payments',
                label: 'Payments',
                actions: [
                    { key: 'view', label: 'View Payments' },
                    { key: 'add', label: 'Add Payment' },
                    { key: 'edit', label: 'Edit Payment' },
                    { key: 'delete', label: 'Delete Payment' },
                    { key: 'print', label: 'Print/Export' }
                ]
            },
            {
                key: 'contra',
                label: 'Contra',
                actions: [
                    { key: 'view', label: 'View Contra' },
                    { key: 'add', label: 'Add Contra' },
                    { key: 'edit', label: 'Edit Contra' },
                    { key: 'delete', label: 'Delete Contra' },
                    { key: 'print', label: 'Print/Export' }
                ]
            },
            {
                key: 'journal',
                label: 'Journal Entry',
                actions: [
                    { key: 'view', label: 'View Journal' },
                    { key: 'add', label: 'Add Journal' },
                    { key: 'edit', label: 'Edit Journal' },
                    { key: 'delete', label: 'Delete Journal' }
                ]
            }
        ]
    },
    {
        key: 'reports',
        label: 'Reports',
        icon: BarChart3,
        description: 'All reports and analytics',
        sections: [
            {
                key: 'sales',
                label: 'Sales Reports',
                modules: [
                    {
                        key: 'invoice_report',
                        label: 'Invoice Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'download', label: 'Download PDF' },
                            { key: 'edit', label: 'Edit' },
                            { key: 'cancel', label: 'Cancel' }
                        ]
                    },
                    {
                        key: 'margin_report',
                        label: 'Margin Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'sales_tax_report',
                        label: 'Sales Tax Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'download', label: 'Download PDF' }
                        ]
                    },
                    {
                        key: 'sales_vat_report',
                        label: 'Sales VAT Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'download', label: 'Download PDF' }
                        ]
                    },
                    {
                        key: 'day_closing_report',
                        label: 'Day Closing Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'pending_invoices',
                        label: 'Pending Invoices',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'settle', label: 'Settle Payment' }
                        ]
                    },

                    {
                        key: 'trash_invoices',
                        label: 'Trash Invoices',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'download', label: 'Download PDF' },
                            { key: 'cancel', label: 'Cancel' }
                        ]
                    },
                    {
                        key: 'service_profit_report',
                        label: 'Service Profit Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'item_profit_report',
                        label: 'Item Profit Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'staff_revenue_report',
                        label: 'Staff Revenue Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    }
                ]
            },
            {
                key: 'staff',
                label: 'Staff Reports',
                modules: [
                    {
                        key: 'staff_report',
                        label: 'Staff Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'download', label: 'Download' },
                            { key: 'call', label: 'Call Staff' }
                        ]
                    },
                    {
                        key: 'staff_commission',
                        label: 'Staff Commission Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'settle', label: 'Settle Payment' }
                        ]
                    },
                    {
                        key: 'staff_attendance_report',
                        label: 'Staff Attendance Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'staff_statement',
                        label: 'Staff Statement',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'settle', label: 'Settle Statement' }
                        ]
                    },
                    {
                        key: 'staff_credit_report',
                        label: 'Staff Credit Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'payroll_report',
                        label: 'Payroll Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'leave_statement',
                        label: 'Leave Statement',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    }
                ]
            },
            {
                key: 'customer',
                label: 'Buyer Reports',
                modules: [
                    {
                        key: 'customer_report',
                        label: 'Buyer Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'call', label: 'Call Buyer' }
                        ]
                    },
                    {
                        key: 'customer_ledger',
                        label: 'Buyer Invoice Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'call', label: 'Call Buyer' }
                        ]
                    },
                    {
                        key: 'customer_statement',
                        label: 'Buyer Statement',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'settle', label: 'Settle Statement' }
                        ]
                    },
                    {
                        key: 'customer_credit_report',
                        label: 'Buyer Credit Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'valuable_customer_report',
                        label: 'Valuable Buyer Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'regular_customer_report',
                        label: 'Regular Buyer Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'loyalty_report',
                        label: 'Loyalty Point Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    }
                ]
            },
            {
                key: 'supplier',
                label: 'Supplier Reports',
                modules: [
                    {
                        key: 'supplier_report',
                        label: 'Supplier Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    },
                    {
                        key: 'supplier_statement',
                        label: 'Supplier Statement',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'settle', label: 'Settle Payment' }
                        ]
                    },
                    {
                        key: 'supplier_credit_report',
                        label: 'Supplier Credit Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' }
                        ]
                    }
                ]
            },
            {
                key: 'stock',
                label: 'Stock Reports',
                modules: [
                    {
                        key: 'stock_report',
                        label: 'Stock Report',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    },
                    {
                        key: 'purchase_report',
                        label: 'Purchase Report',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    },
                    {
                        key: 'purchase_tax_report',
                        label: 'Purchase Tax Report',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    },
                    {
                        key: 'purchase_return_report',
                        label: 'Purchase Return Report',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    },

                    {
                        key: 'damage_report',
                        label: 'Damage Books Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'edit', label: 'Edit' }
                        ]
                    },
                    {
                        key: 'consumption_report',
                        label: 'Consumption Books Report',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'edit', label: 'Edit' }
                        ]
                    }
                ]
            },
            {
                key: 'accounts',
                label: 'Accounts Reports',
                modules: [
                    {
                        key: 'account_statement',
                        label: 'Account Statement',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    },
                    {
                        key: 'receipt_report',
                        label: 'Receipt Report',
                        actions: [{ key: 'view', label: 'View' }]
                    },
                    {
                        key: 'payment_report',
                        label: 'Payment Report',
                        actions: [{ key: 'view', label: 'View' }]
                    },
                    {
                        key: 'contra_report',
                        label: 'Contra Report',
                        actions: [{ key: 'view', label: 'View' }]
                    },
                    {
                        key: 'journal_report',
                        label: 'Journal Report',
                        actions: [{ key: 'view', label: 'View' }]
                    },
                    {
                        key: 'trial_balance',
                        label: 'Trial Balance',
                        actions: [{ key: 'view', label: 'View' }]
                    },
                    {
                        key: 'balance_sheet',
                        label: 'Balance Sheet',
                        actions: [{ key: 'view', label: 'View' }]
                    },
                    {
                        key: 'profit_loss',
                        label: 'Profit & Loss',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    },
                    {
                        key: 'vat_in_report',
                        label: 'VAT IN',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    },
                    {
                        key: 'vat_out_report',
                        label: 'VAT OUT',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'export', label: 'Export' },
                            { key: 'download', label: 'Download PDF' }
                        ]
                    },
                    {
                        key: 'business_status_report',
                        label: 'Business Status Report',
                        actions: [{ key: 'view', label: 'View' }]
                    },
                    {
                        key: 'day_report',
                        label: 'Day Report',
                        actions: [ { key: 'view', label: 'View' }, { key: 'export', label: 'Export' } ]
                    }
                ]
            }
        ]
    },
    {
        key: 'settings',
        label: 'Settings',
        icon: Settings,
        description: 'Manage shop settings and master data',
        sections: [
            {
                key: 'profile',
                label: 'Shop Profile',
                modules: [
                    {
                        key: 'general',
                        label: 'General Profile',
                        actions: [
                            { key: 'view', label: 'View Profile' },
                            { key: 'edit', label: 'Edit Profile' }
                        ]
                    },

                ]
            },
            {
                key: 'printer',
                label: 'Printer',
                modules: [
                    {
                        key: 'general',
                        label: 'Printer Settings',
                        actions: [
                            { key: 'view', label: 'View Settings' },
                            { key: 'edit', label: 'Edit Settings' },
                            { key: 'test_print', label: 'Test Print' },
                            { key: 'scan', label: 'Scan Printers' }
                        ]
                    }
                ]
            },
            {
                key: 'day_closing',
                label: 'Day Closing',
                modules: [
                    {
                        key: 'general',
                        label: 'Day Closing Settings',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'edit', label: 'Edit Settings' },
                            { key: 'manage', label: 'Open/Close Counter' }
                        ]
                    }
                ]
            },

            {
                key: 'more',
                label: 'More',
                modules: [
                    {
                        key: 'configuration',
                        label: 'Configuration',
                        modules: [
                            {
                                key: 'sales',
                                label: 'Sales Configuration',
                                actions: [
                                    { key: 'view', label: 'View' },
                                    { key: 'edit', label: 'Edit' }
                                ]
                            },
                            {
                                key: 'cart',
                                label: 'Cart Management',
                                actions: [
                                    { key: 'view', label: 'View' },
                                    { key: 'edit', label: 'Edit' }
                                ]
                            }
                        ]
                    },
                    {
                        key: 'documents',
                        label: 'Document Settings',
                        actions: [
                            { key: 'view', label: 'View Settings' },
                            { key: 'edit', label: 'Edit Settings' }
                        ]
                    },

                    {
                        key: 'previews',
                        label: 'Previews',
                        actions: [
                            { key: 'view', label: 'View Previews' }
                        ]
                    },
                    {
                        key: 'privileges',
                        label: 'Privilege Management',
                        actions: [
                            { key: 'view', label: 'View Privileges' },
                            { key: 'add', label: 'Create Privilege' },
                            { key: 'edit', label: 'Edit Privilege' },
                            { key: 'delete', label: 'Delete Privilege' },
                            { key: 'assign', label: 'Assign to Staff' }
                        ]
                    },
                    {
                        key: 'qr_codes',
                        label: 'Shop QR Codes',
                        actions: [
                            { key: 'view', label: 'View QR Codes' },
                            { key: 'download', label: 'Download QR' },
                            { key: 'share', label: 'Share QR' }
                        ]
                    },
                    {
                        key: 'complaints',
                        label: 'Complaint Registration',
                        actions: [
                            { key: 'view', label: 'View Complaints' },
                            { key: 'add', label: 'Register Complaint' }
                        ]
                    },
                    {
                        key: 'reviews',
                        label: 'Review Management',
                        actions: [
                            { key: 'view', label: 'View Reviews' },
                            { key: 'reply', label: 'Reply to Reviews' }
                        ]
                    },
                    {
                        key: 'integrations',
                        label: 'Integrations',
                        actions: [
                            { key: 'view', label: 'View Integrations' },
                            { key: 'add', label: 'Add Integration' },
                            { key: 'edit', label: 'Edit Integration' },
                            { key: 'delete', label: 'Delete Integration' },
                            { key: 'toggle', label: 'Toggle Status' }
                        ]
                    },
                    {
                        key: 'clear_database',
                        label: 'Clear Database',
                        actions: [
                            { key: 'delete', label: 'Clear Database' }
                        ]
                    }
                ]
            },
            {
                key: 'manage',
                label: 'Master Data (Manage)',
                modules: [
                    {
                        key: 'categories',
                        label: 'Categories',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'add', label: 'Add' },
                            { key: 'edit', label: 'Edit' },
                            { key: 'delete', label: 'Delete' },
                            { key: 'toggle', label: 'Toggle Status' }
                        ]
                    },
                    {
                        key: 'departments',
                        label: 'Departments',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'add', label: 'Add' },
                            { key: 'edit', label: 'Edit' },
                            { key: 'delete', label: 'Delete' },
                            { key: 'toggle', label: 'Toggle Status' }
                        ]
                    },
                    {
                        key: 'variants',
                        label: 'Variants',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'add', label: 'Add' },
                            { key: 'edit', label: 'Edit' },
                            { key: 'delete', label: 'Delete' },
                            { key: 'toggle', label: 'Toggle Status' }
                        ]
                    },
                    {
                        key: 'units',
                        label: 'Units',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'add', label: 'Add' },
                            { key: 'edit', label: 'Edit' },
                            { key: 'delete', label: 'Delete' }
                        ]
                    },
                    {
                        key: 'taxes',
                        label: 'Tax Rates',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'add', label: 'Add' },
                            { key: 'edit', label: 'Edit' },
                            { key: 'delete', label: 'Delete' },
                            { key: 'toggle', label: 'Toggle Status' }
                        ]
                    },
                    {
                        key: 'payments',
                        label: 'Payment Methods',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'add', label: 'Add' },
                            { key: 'edit', label: 'Edit' },
                            { key: 'delete', label: 'Delete' },
                            { key: 'toggle', label: 'Toggle Status' }
                        ]
                    },
                    {
                        key: 'roundoff',
                        label: 'Round-Off Settings',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'edit', label: 'Edit' }
                        ]
                    },
                    {
                        key: 'regional',
                        label: 'Regional Settings',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'edit', label: 'Edit' }
                        ]
                    },
                    {
                        key: 'theme',
                        label: 'Theme Customization',
                        actions: [
                            { key: 'view', label: 'View' },
                            { key: 'edit', label: 'Edit' }
                        ]
                    }
                ]
            }
        ]
    }
];
