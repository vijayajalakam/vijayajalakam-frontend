import React from "react";
import { useNavigate, useLocation, Outlet, useParams } from "react-router-dom";
import {
  FileText,
  Users,
  CreditCard,
  TrendingUp,
  XCircle,
  Package,
  BarChart3,
  Truck,
  ClipboardList,
  AlertTriangle,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  PieChart,
  CalendarDays,
  ShoppingCart,
  Landmark,
  Contact,
  UserCog,
  Store,
  CalendarCheck,
  CalendarRange,
  MinusCircle,
  Trash2,
  Trophy,
  Repeat2,
  DollarSign,
  Boxes,
  ChevronDown,
  ChevronRight,
  Wallet,
  Award,
  HandCoins
} from "lucide-react";

import { useAuth } from "../../../features/auth/hooks/useAuth";

const ReportsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { shopSlug } = useParams();
  const { hasPermission, portalRole } = useAuth();
  const getPath = (path) => (shopSlug ? `/${shopSlug}${path}` : path);

  // Create a version of the path that uses the correct portalRole
  const getDynamicPortalPath = (path) => {
    const cleanPath = path.replace(/^\/(admin|staff)/, "");
    return getPath(`/${portalRole}${cleanPath}`);
  };

  const isDashboard =
    location.pathname.replace(/\/$/, "").split("/").pop() === "reports";

  const categories = [
    {
      title: "Sales Reports",
      color: "blue",
      icon: ShoppingCart,
      reports: [
        {
          id: "invoices",
          label: "Invoice",
          icon: FileText,
          path: getDynamicPortalPath("/admin/reports/invoices"),
          permission: "reports:sales:invoice_report"
        },
        {
          id: "margin-report",
          label: "Margin Report",
          icon: TrendingUp,
          path: getDynamicPortalPath("/admin/reports/margin-report"),
          permission: "reports:sales:margin_report"
        },
        {
          id: "pending-invoices",
          label: "Pending Invoices",
          icon: ClipboardList,
          path: getDynamicPortalPath("/admin/reports/pending-invoices"),
          permission: "reports:sales:pending_invoices"
        },
        {
          id: "trash-invoices",
          label: "Trash Invoices",
          icon: Trash2,
          path: getDynamicPortalPath("/admin/reports/trash-invoices"),
          permission: "reports:sales:trash_invoices"
        },
        {
          id: "item-profit-report",
          label: "Item Profit",
          icon: Boxes,
          path: getDynamicPortalPath("/admin/reports/item-profit-report"),
          permission: "reports:sales:item_profit_report"
        },
        {
          id: "staff-revenue-report",
          label: "Staff Revenue Report",
          icon: Users,
          path: getDynamicPortalPath("/admin/reports/staff-revenue-report"),
          permission: "reports:sales:staff_revenue_report"
        },
        {
          id: "day-closing-report",
          label: "Day Closing Report",
          icon: CalendarDays,
          path: getDynamicPortalPath("/admin/reports/day-closing-report"),
          permission: "reports:sales:day_closing_report"
        },
      ],
    },
    {
      title: "Staff Reports",
      color: "purple",
      icon: UserCog,
      reports: [
        {
          id: "staff-report",
          label: "Staff Report",
          icon: Users,
          path: getDynamicPortalPath("/admin/reports/staff-report"),
          permission: "reports:staff:staff_report"
        },
        {
          id: "commission",
          label: "Staff Commission Report",
          icon: Users,
          path: getDynamicPortalPath("/admin/reports/staff-commission"),
          permission: "reports:staff:staff_commission"
        },
        {
          id: "staff-attendance",
          label: "Staff Attendance Report",
          icon: CalendarCheck,
          path: getDynamicPortalPath("/admin/reports/staff-attendance"),
          permission: "reports:staff:staff_attendance_report"
        },
        {
          id: "staff-stmt",
          label: "Staff Statement",
          icon: ClipboardList,
          path: getDynamicPortalPath("/admin/reports/staff-statement"),
          permission: "reports:staff:staff_statement"
        },
        {
          id: "staff-credit-report",
          label: "Staff Credit Report",
          icon: CreditCard,
          path: getDynamicPortalPath("/admin/reports/staff-credit-report"),
          permission: "reports:staff:staff_credit_report"
        },
        {
          id: "payroll-report",
          label: "Payroll Report",
          icon: Wallet,
          path: getDynamicPortalPath("/admin/reports/payroll-report"),
          permission: "reports:staff:payroll_report"
        },
        {
          id: "staff-settlement",
          label: "Staff Settlement Report",
          icon: HandCoins,
          path: getDynamicPortalPath("/admin/reports/staff-settlement"),
          permission: "reports:staff:staff_commission"
        },
        {
          id: "leave-statement",
          label: "Leave Statement",
          icon: CalendarRange,
          path: getDynamicPortalPath("/admin/reports/leave-statement"),
          permission: "reports:staff:leave_statement"
        },
      ],
    },
    {
      title: "Buyer Reports",
      color: "green",
      icon: Contact,
      reports: [
        {
          id: "customer-report",
          label: "Buyer Report",
          icon: Users,
          path: getDynamicPortalPath("/admin/reports/customer-report"),
          permission: "reports:customer:customer_report"
        },
        {
          id: "ledger",
          label: "Buyer Invoice Report",
          icon: CreditCard,
          path: getDynamicPortalPath("/admin/reports/customer-invoice-report"),
          permission: "reports:customer:customer_ledger"
        },
        {
          id: "customer-stmt",
          label: "Buyer Statement",
          icon: ClipboardList,
          path: getDynamicPortalPath("/admin/reports/customer-statement"),
          permission: "reports:customer:customer_statement"
        },
        {
          id: "customer-credit-report",
          label: "Buyer Credit Report",
          icon: CreditCard,
          path: getDynamicPortalPath("/admin/reports/customer-credit-report"),
          permission: "reports:customer:customer_credit_report"
        },
        {
          id: "valuable-customer-report",
          label: "Valuable Buyer",
          icon: Trophy,
          path: getDynamicPortalPath("/admin/reports/valuable-customer-report"),
          permission: "reports:customer:valuable_customer_report"
        },
        {
          id: "regular-customer-report",
          label: "Regular Buyer",
          icon: Repeat2,
          path: getDynamicPortalPath("/admin/reports/regular-customer-report"),
          permission: "reports:customer:regular_customer_report"
        },
        {
          id: "loyalty-point-report",
          label: "Loyalty Point Report",
          icon: Award,
          path: getDynamicPortalPath("/admin/reports/loyalty-point-report"),
          permission: "reports:customer:loyalty_report"
        },
      ],
    },
    {
      title: "Stock Reports",
      color: "orange",
      icon: Package,
      reports: [
        {
          id: "stock",
          label: "Stock Report",
          icon: BarChart3,
          path: getDynamicPortalPath("/admin/reports/stock-report"),
          permission: "reports:stock:stock_report"
        },
        {
          id: "damage",
          label: "Damage Books Report",
          icon: AlertTriangle,
          path: getDynamicPortalPath("/admin/reports/damage-report"),
          permission: "reports:stock:damage_report"
        },
        {
          id: "consumption-report",
          label: "Consumption Books Report",
          icon: MinusCircle,
          path: getDynamicPortalPath("/admin/reports/consumption-report"),
          permission: "reports:stock:consumption_report"
        },
      ],
    },
    {
      title: "Accounts Reports",
      color: "emerald",
      icon: Landmark,
      reports: [
        {
          id: "account-stmt",
          label: "Account Statement",
          icon: Receipt,
          path: getDynamicPortalPath("/admin/reports/account-statement"),
          permission: "reports:accounts:account_statement"
        },
        {
          id: "receipt-report",
          label: "Receipt Report",
          icon: ArrowDownCircle,
          path: getDynamicPortalPath("/admin/reports/receipt-report"),
          permission: "reports:accounts:receipt_report"
        },
        {
          id: "payment-report",
          label: "Payment Report",
          icon: ArrowUpCircle,
          path: getDynamicPortalPath("/admin/reports/ac-payment-report"),
          permission: "reports:accounts:payment_report"
        },
        {
          id: "trial-balance",
          label: "Trial Balance",
          icon: Scale,
          path: getDynamicPortalPath("/admin/reports/trial-balance"),
          permission: "reports:accounts:trial_balance"
        },
        {
          id: "balance-sheet",
          label: "Balance Sheet",
          icon: BarChart3,
          path: getDynamicPortalPath("/admin/reports/balance-sheet"),
          permission: "reports:accounts:balance_sheet"
        },
        {
          id: "profit-loss",
          label: "Profit & Loss",
          icon: TrendingUp,
          path: getDynamicPortalPath("/admin/reports/profit-loss"),
          permission: "reports:accounts:profit_loss"
        },
        {
          id: "business-status-report",
          label: "Business Status Report",
          icon: BarChart3,
          path: getDynamicPortalPath("/admin/reports/business-status-report"),
          permission: "reports:accounts:business_status_report"
        },
        {
          id: "day-report",
          label: "Day Report",
          icon: CalendarDays,
          path: getDynamicPortalPath("/admin/reports/day-report"),
          permission: "reports:accounts:day_report"
        },
      ],
    },
    {
      title: "Settings Reports",
      color: "emerald",
      icon: Store,
      reports: []
    },
  ];

  const styles = {
    blue: {
      text: "text-blue-600",
      iconBg: "bg-blue-50",
      pillIcon: "bg-blue-100 text-blue-600",
    },
    purple: {
      text: "text-purple-600",
      iconBg: "bg-purple-50",
      pillIcon: "bg-purple-100 text-purple-600",
    },
    green: {
      text: "text-emerald-600",
      iconBg: "bg-emerald-50",
      pillIcon: "bg-emerald-100 text-emerald-600",
    },
    orange: {
      text: "text-orange-600",
      iconBg: "bg-orange-50",
      pillIcon: "bg-orange-100 text-orange-600",
    },
    emerald: {
      text: "text-emerald-600",
      iconBg: "bg-emerald-50",
      pillIcon: "bg-emerald-100 text-emerald-600",
    },
    indigo: {
      text: "text-indigo-600",
      iconBg: "bg-indigo-50",
      pillIcon: "bg-indigo-100 text-indigo-600",
    },
  };

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      reports: category.reports.filter(
        (report) => !report.permission || hasPermission(report.permission)
      ),
    }))
    .filter((category) => category.reports.length > 0);

  const [expandedSections, setExpandedSections] = React.useState(() => {
    const all = {};
    filteredCategories.forEach(c => { all[c.title] = true; });
    return all;
  });

  React.useEffect(() => {
    if (location.state?.targetSection) {
      setExpandedSections({ [location.state.targetSection]: true });
      setTimeout(() => {
        const el = document.getElementById(`section-${location.state.targetSection.replace(/\s+/g, '-')}`);
        if (el) {
          // scroll to the element but slightly higher to account for header
          const y = el.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location.state]);

  const toggleSection = (title) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  if (!isDashboard) {
    return <Outlet />;
  }

  return (
    <div className="pb-20 animate-in fade-in duration-500 bg-gray-50/50 dark:bg-transparent flex flex-col gap-1.5">
      {filteredCategories.map((category, idx) => {
        const CategoryIcon = category.icon;
        const style = styles[category.color] || styles.blue;

        return (
          <div
            key={idx}
            id={`section-${category.title.replace(/\s+/g, '-')}`}
            className="bg-white dark:bg-dark-surface border-y border-gray-100/80 dark:border-dark-border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
          >
            <div 
              onClick={() => toggleSection(category.title)}
              className="border-b border-gray-100 dark:border-dark-border flex items-center justify-between px-4 md:px-6 py-3.5 cursor-pointer hover:bg-gray-50 dark:bg-dark-card/50 dark:hover:bg-dark-bg/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-lg flex items-center justify-center ${style.iconBg} ${style.text}`}
                >
                  <CategoryIcon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
                  {category.title}
                </h2>
              </div>
              <div className="text-gray-400 dark:text-gray-500">
                {expandedSections[category.title] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </div>

            {expandedSections[category.title] && (
            <div className="px-4 md:px-6 py-5 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3">
                {category.reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => navigate(report.path)}
                    className="flex items-center gap-2.5 pl-3 pr-5 py-2.5 bg-gray-50/50 dark:bg-dark-card/50 border border-gray-100 dark:border-dark-border rounded-[12px] hover:bg-white dark:hover:bg-dark-surface hover:border-brand-primary/30 hover:shadow-sm hover:shadow-brand-primary/5 transition-all group text-left w-full md:w-auto"
                  >
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 bg-white dark:bg-dark-surface ${style.text} transition-colors group-hover:bg-brand-primary group-hover:text-white shadow-sm`}
                    >
                      <report.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] md:text-[12px] font-semibold text-gray-700 dark:text-gray-300 group-hover:text-brand-primary transition-colors leading-tight truncate">
                      {report.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReportsPage;
