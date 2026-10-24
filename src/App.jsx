import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { AuthProvider } from "./features/auth/components/AuthProvider";
import ProtectedRoute from "./features/auth/components/ProtectedRoute";
import AdminLayout from "./layouts/admin/AdminLayout";
import UserLayout from "./layouts/user/UserLayout";
import GoogleTranslate from "./components/shared/GoogleTranslate";

import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";

import Dashboard from "./features/dashboard/pages/Dashboard";
import StaffManager from "./features/staff/pages/StaffManager";
import StaffPage, { HRMPage } from "./features/staff/pages/StaffPage";
import PayrollPage from "./features/staff/pages/PayrollPage";
import AttendanceManager from "./features/staff/pages/AttendanceManager";
import InvoicesPage from "./features/invoice/pages/InvoicesPage";
import BuyerManager, { CustomerManager } from "./features/buyer/pages/BuyerManager";
import BuyerPage, { CRMPage } from "./features/buyer/pages/BuyerPage";
import BuyerGroupManager, { CustomerGroupManager } from "./features/buyer/pages/BuyerGroupManager";
import LoyaltyPointsManager from "./features/buyer/pages/LoyaltyPointsManager";
import PrinterSettings from "./features/settings/pages/PrinterSettings";
import DayClosingSettings from "./features/settings/pages/DayClosingSettings";
import ConfigurationSettings from "./features/settings/pages/ConfigurationSettings";
import SettingsPage from "./features/settings/pages/SettingsPage";
import ManageSettingsPage from "./features/settings/pages/ManageSettingsPage";
import AdminProfile from "./features/auth/pages/AdminProfile";
import EditProfile from "./features/booking/pages/EditProfile";
import EditAddress from "./features/booking/pages/EditAddress";
import EditProfileDetails from "./features/booking/pages/EditProfileDetails";
import ReportsPage from "./features/reports/pages/ReportsPage";
import InvoiceReport from "./features/reports/pages/InvoiceReport";
import SalesMarginReport from "./features/reports/pages/SalesMarginReport";
import StaffCommissionReport from "./features/reports/pages/StaffCommissionReport";
import StaffRevenueReportPage from "./features/reports/pages/StaffRevenueReportPage";
import CustomerInvoiceReport from "./features/reports/pages/CustomerInvoiceReport";
import PendingInvoices from "./features/reports/pages/PendingInvoices";
import ProfitLossReport from "./features/reports/pages/ProfitLossReport";
import LoyaltyPointReport from "./features/reports/pages/LoyaltyPointReport";
import StaffReportPage from "./features/reports/pages/StaffReportPage";
import StaffAttendanceReportPage from "./features/reports/pages/StaffAttendanceReportPage";
import LeaveStatementReportPage from "./features/reports/pages/LeaveStatementReportPage";
import PayrollReportPage from "./features/reports/pages/PayrollReportPage";
import CustomerReportPage from "./features/reports/pages/CustomerReportPage";
import CustomerStatementPage from "./features/reports/pages/CustomerStatementPage";
import CustomerCreditReportPage from "./features/reports/pages/CustomerCreditReportPage";
import DayCloseReport from "./features/reports/pages/DayCloseReport";
import ValuableCustomerReportPage from "./features/reports/pages/ValuableCustomerReportPage";
import RegularCustomerReportPage from "./features/reports/pages/RegularCustomerReportPage";
import StaffStatementPage from "./features/reports/pages/StaffStatementPage";
import StaffCreditReportPage from "./features/reports/pages/StaffCreditReportPage";
import SupplierCreditReportPage from "./features/reports/pages/SupplierCreditReportPage";
import TrashInvoiceReport from "./features/reports/pages/TrashInvoiceReport";
import StaffSettlementReport from "./features/reports/pages/StaffSettlementReport";
import MorePage from "./features/settings/pages/MorePage";
import DocumentSettings from "./features/settings/pages/DocumentSettings";
import PrivilegeManagement from "./features/settings/pages/PrivilegeManagement";
import PrivilegeForm from "./features/settings/pages/PrivilegeForm";
import SalesTaxReport from "./features/reports/pages/SalesTaxReport";
import SalesVatReport from "./features/reports/pages/SalesVatReport";
import ItemProfitReport from "./features/reports/pages/ItemProfitReport";
import QrCodePage from "./features/settings/pages/QrCodePage";
import BusinessStatusReportPage from "./features/reports/pages/BusinessStatusReportPage";
import IntegrationsPage from "./features/settings/pages/IntegrationsPage";
import WhatsAppSettings from "./features/settings/pages/WhatsAppSettings";
import SmtpSettingsPage from "./features/settings/pages/SmtpSettingsPage";
import PreviewsPage from "./features/settings/pages/PreviewsPage";


// Stock Module
import StockPage from "./features/stock/pages/StockPage";
import DamageBooksPage from "./features/stock/pages/DamageBooksPage";
import ConsumptionBooksPage from "./features/stock/pages/ConsumptionBooksPage";
import AdjustBooksPage from "./features/stock/pages/AdjustBooksPage";
import ProductMasterPage from "./features/stock/pages/ProductMasterPage";
import SupplierManager from "./features/purchases/pages/SupplierManager";
import StockReportPage from "./features/stock/pages/StockReportPage";
import SupplierCreditReportPageLegacy from "./features/purchases/pages/SupplierCreditReportPage";
import SupplierStatementPage from "./features/purchases/pages/SupplierStatementPage";
import DamageBooksReportPage from "./features/stock/pages/DamageBooksReportPage";
import ConsumptionBooksReportPage from "./features/stock/pages/ConsumptionBooksReportPage";
import PurchaseVatReport from "./features/purchases/pages/PurchaseVatReport";

// Accounts Module
import AccountsPage from "./features/accounts/pages/AccountsPage";
import ChartOfAccountsPage from "./features/accounts/pages/ChartOfAccountsPage";
import {
  ReceiptPage,
  PaymentVoucherPage,
} from "./features/accounts/pages/TransactionPage";
import AccountStatementPage from "./features/accounts/pages/AccountStatementPage";
import TrialBalancePage from "./features/accounts/pages/TrialBalancePage";
import BalanceSheetPage from "./features/accounts/pages/BalanceSheetPage";
import ProfitLossPage from "./features/accounts/pages/ProfitLossPage";
import ReceiptReportPage from "./features/accounts/pages/ReceiptReportPage";
import PaymentReportPage from "./features/accounts/pages/PaymentReportPage";
import GSTReportPage from "./features/accounts/pages/GSTReportPage";
import DayReportPage from "./features/accounts/pages/DayReportPage";

import UnifiedInvoiceEntry from "./features/invoice/pages/UnifiedInvoiceEntry";
import UserHome from "./features/booking/pages/UserHome";
import ShopGallery from "./features/booking/pages/ShopGallery";
import UserProfile from "./features/booking/pages/UserProfile";
import Favourites from "./features/booking/pages/Favourites";
import ProductCheckout from "./features/booking/pages/ProductCheckout";
import CartCheckout from "./features/booking/pages/CartCheckout";
import ProductDetail from "./features/booking/pages/ProductDetail";
import Cart from "./features/booking/pages/Cart";

import ShopDisabledModal from "./components/shared/ShopDisabledModal";
import ThemeProviderInner from "./components/shared/ThemeProvider";
import SearchScreen from "./features/booking/pages/SearchScreen";
import LocationPicker from "./features/booking/pages/LocationPicker";
import { useState, useEffect } from "react";
import ForgotPasswordPage from "./pages/ForgetPasswordPage";
import PrivacyPolicyPage from "./features/legal/pages/PrivacyPolicyPage";
import TermsConditionsPage from "./features/legal/pages/TermsConditionsPage";
import { useGlobalHorizontalScroll } from "./hooks/useGlobalHorizontalScroll";
import { useAuth } from "./features/auth/hooks/useAuth";
import { getPortalRole } from "./utils/portalUtils";

const RootHome = () => {
  const { user } = useAuth();
  if (user) {
    const rolePrefix = getPortalRole(user.role);
    if (rolePrefix === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (rolePrefix === "staff") return <Navigate to="/staff/invoices" replace />;
  }
  return <UserHome />;
};

const LegacyPortalRedirect = () => {
  const { portalRole, "*": rest } = useParams();
  const normalizedRole = getPortalRole(portalRole);
  return <Navigate to={`/${normalizedRole}/${rest || "dashboard"}`} replace />;
};

const NotFound = () => (
  <div className="p-8 text-center text-2xl">404 - Not Found</div>
);

function App() {
  useGlobalHorizontalScroll();

  const [isShopDisabled, setIsShopDisabled] = useState(false);

  useEffect(() => {
    const handleShopDisabled = () => setIsShopDisabled(true);
    window.addEventListener("shop-disabled", handleShopDisabled);
    return () =>
      window.removeEventListener("shop-disabled", handleShopDisabled);
  }, []);

  return (
    <Router>
      <ShopDisabledModal isOpen={isShopDisabled} />
      <AuthProvider>
        <ThemeProviderInner>
          <GoogleTranslate />
          <Routes>
            {/* Top-Level Redirects */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/staff" element={<Navigate to="/staff/invoices" replace />} />

            {/* Admin & Staff Protected Routes with Sidebar Layout */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "staff", "SHOP_ADMIN"]}
                />
              }
            >

                <Route element={<AdminLayout />}>
                  <Route path=":portalRole/dashboard" element={<Dashboard />} />
                  <Route element={<ProtectedRoute requiredPermission="hrm" />}>
                    <Route path=":portalRole/hrm" element={<HRMPage />}>
                      <Route path="staff" element={<StaffManager />} />
                      <Route path="attendance" element={<AttendanceManager />} />
                      <Route path="payroll" element={<PayrollPage />} />
                      <Route
                        path="security"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:privileges:view">
                            <PrivilegeManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="security/new"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:privileges:add">
                            <PrivilegeForm />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="security/edit/:id"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:privileges:edit">
                            <PrivilegeForm />
                          </ProtectedRoute>
                        }
                      />
                    </Route>
                  </Route>
                  <Route
                    element={<ProtectedRoute requiredPermission="invoice" />}
                  >
                    <Route path=":portalRole/invoices" element={<InvoicesPage />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="crm" />}>
                    <Route path=":portalRole/crm" element={<CRMPage />}>
                      <Route
                        path="customers"
                        element={
                          <ProtectedRoute requiredPermission="crm:customers:view">
                            <CustomerManager />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="groups"
                        element={
                          <ProtectedRoute requiredPermission="crm:customer_group:view">
                            <CustomerGroupManager />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="loyalty-points"
                        element={
                          <ProtectedRoute requiredPermission="crm:loyalty_points:view">
                            <LoyaltyPointsManager />
                          </ProtectedRoute>
                        }
                      />
                    </Route>
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="srm" />}>
                    <Route
                      path=":portalRole/srm"
                      element={
                        <ProtectedRoute requiredPermission="srm:suppliers:view">
                          <SupplierManager />
                        </ProtectedRoute>
                      }
                    />
                  </Route>

                  {/* Settings Routes */}
                  <Route
                    element={<ProtectedRoute requiredPermission="settings" />}
                  >
                    <Route path=":portalRole/settings" element={<SettingsPage />}>
                      {/* Removed hardcoded profile redirect to allow SettingsPage to handle dynamic redirect */}
                      <Route
                        path="profile"
                        element={
                          <ProtectedRoute requiredPermission="settings:profile:general:view">
                            <AdminProfile />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="printer"
                        element={
                          <ProtectedRoute requiredPermission="settings:printer:general:view">
                            <PrinterSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="day-closing"
                        element={
                          <ProtectedRoute requiredPermission="settings:day_closing:general:view">
                            <DayClosingSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="manage"
                        element={
                          <ProtectedRoute requiredPermission="settings:manage">
                            <ManageSettingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="manage/:subTab"
                        element={
                          <ProtectedRoute requiredPermission="settings:manage">
                            <ManageSettingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/configuration"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:configuration:view">
                            <ConfigurationSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more"
                        element={
                          <ProtectedRoute requiredPermission="settings:more">
                            <MorePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/previews"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:previews:view">
                            <PreviewsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/documents"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:documents:view">
                            <DocumentSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/qr-codes"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:qr_codes:view">
                            <QrCodePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/integrations"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:integrations:view">
                            <IntegrationsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/integrations/whatsapp"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:integrations:edit">
                            <WhatsAppSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/integrations/smtp"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:integrations:edit">
                            <SmtpSettingsPage />
                          </ProtectedRoute>
                        }
                      />


                      <Route
                        path="more/privileges"

                        element={
                          <ProtectedRoute requiredPermission="settings:more:privileges:view">
                            <PrivilegeManagement />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/privileges/new"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:privileges:add">
                            <PrivilegeForm />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/privileges/edit/:id"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:privileges:edit">
                            <PrivilegeForm />
                          </ProtectedRoute>
                        }
                      />
                    </Route>
                  </Route>

                  {/* Reports Routes */}
                  <Route
                    element={<ProtectedRoute requiredPermission="reports" />}
                  >
                    <Route path=":portalRole/reports" element={<ReportsPage />}>
                      <Route
                        path="invoices"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:invoice_report">
                            <InvoiceReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="margin-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:margin_report">
                            <SalesMarginReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="sales-tax"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:sales_tax_report">
                            <SalesTaxReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="vat-out"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:sales_vat_report">
                            <SalesVatReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="pending-invoices"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:pending_invoices">
                            <PendingInvoices />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff-commission"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:staff_commission">
                            <StaffCommissionReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff-settlement"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:staff_commission">
                            <StaffSettlementReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff-attendance"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:staff_report">
                            <StaffAttendanceReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="leave-statement"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:leave_statement">
                            <LeaveStatementReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="customer-invoice-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:customer:customer_ledger">
                            <CustomerInvoiceReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="loyalty-point-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:customer:loyalty_report">
                            <LoyaltyPointReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="profit-loss"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:profit_loss">
                            <ProfitLossPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:staff_report">
                            <StaffReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="customer-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:customer:customer_report">
                            <CustomerReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="customer-statement"
                        element={
                          <ProtectedRoute requiredPermission="reports:customer:customer_statement">
                            <CustomerStatementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="customer-credit-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:customer:customer_credit_report">
                            <CustomerCreditReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="valuable-customer-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:customer:valuable_customer_report">
                            <ValuableCustomerReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="regular-customer-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:customer:regular_customer_report">
                            <RegularCustomerReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff-statement"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:staff_statement">
                            <StaffStatementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff-credit-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:staff_credit_report">
                            <StaffCreditReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="payroll-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:staff:payroll_report">
                            <PayrollReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="trash-invoices"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:trash_invoices">
                            <TrashInvoiceReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="item-profit-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:item_profit_report">
                            <ItemProfitReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="staff-revenue-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:staff_revenue_report">
                            <StaffRevenueReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="day-closing-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:day_closing_report">
                            <DayCloseReport />
                          </ProtectedRoute>
                        }
                      />

                      {/* Duplicated Stock Reports for Reports Sidebar */}
                      <Route
                        path="stock-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:stock_report">
                            <StockReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="vat-in"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:vat_in_report">
                            <PurchaseVatReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="credit-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:supplier:supplier_report">
                            <SupplierCreditReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="supplier-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:supplier:supplier_report">
                            <SupplierCreditReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="supplier-credit-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:supplier:supplier_credit_report">
                            <SupplierCreditReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="supplier-statement"
                        element={
                          <ProtectedRoute requiredPermission="reports:supplier:supplier_statement">
                            <SupplierStatementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="damage-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:damage_report">
                            <DamageBooksReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="consumption-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:consumption_report">
                            <ConsumptionBooksReportPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Duplicated Accounts Reports for Reports Sidebar */}
                      <Route
                        path="business-status-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:business_status_report">
                            <BusinessStatusReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="account-statement"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:account_statement">
                            <AccountStatementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="trial-balance"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:trial_balance">
                            <TrialBalancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="balance-sheet"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:balance_sheet">
                            <BalanceSheetPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="receipt-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:receipt_report">
                            <ReceiptReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="ac-payment-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:payment_report">
                            <PaymentReportPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="vat-in-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:vat_in_report">
                            <PurchaseVatReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="vat-out-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:vat_out_report">
                            <SalesVatReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="day-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:day_report">
                            <DayReportPage />
                          </ProtectedRoute>
                        }
                      />
                    </Route>
                  </Route>


                  {/* Stock Routes */}
                  <Route
                    element={<ProtectedRoute requiredPermission="stock" />}
                  >
                    <Route path=":portalRole/stock" element={<StockPage />}>
                      {/* Removed hardcoded services redirect to allow StockPage to handle dynamic redirect */}
                      <Route
                        path="products"
                        element={
                          <ProtectedRoute requiredPermission="stock:products:view">
                            <ProductMasterPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="damage-entry"
                        element={
                          <ProtectedRoute requiredPermission="stock:damage_entry:view">
                            <DamageBooksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="damage-books"
                        element={
                          <ProtectedRoute requiredPermission="stock:damage_entry:view">
                            <DamageBooksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="consumption-entry"
                        element={
                          <ProtectedRoute requiredPermission="stock:consumption_entry:view">
                            <ConsumptionBooksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="consumption-books"
                        element={
                          <ProtectedRoute requiredPermission="stock:consumption_entry:view">
                            <ConsumptionBooksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="stock-adjustment"
                        element={
                          <ProtectedRoute requiredPermission="stock:stock_adjustment:view">
                            <AdjustBooksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="adjust-books"
                        element={
                          <ProtectedRoute requiredPermission="stock:stock_adjustment:view">
                            <AdjustBooksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="stock-report"
                        element={<StockReportPage />}
                      />
                      <Route
                        path="credit-report"
                        element={<SupplierCreditReportPageLegacy />}
                      />
                      <Route
                        path="supplier-statement"
                        element={<SupplierStatementPage />}
                      />
                      <Route
                        path="damage-report"
                        element={<DamageBooksReportPage />}
                      />
                      <Route
                        path="consumption-report"
                        element={<ConsumptionBooksReportPage />}
                      />
                    </Route>
                  </Route>

                  {/* Accounts Routes */}
                  <Route
                    element={<ProtectedRoute requiredPermission="accounts" />}
                  >
                    <Route path=":portalRole/accounts" element={<AccountsPage />}>
                      <Route
                        index
                        element={<Navigate to="chart-of-accounts" replace />}
                      />
                      <Route
                        path="chart-of-accounts"
                        element={
                          <ProtectedRoute requiredPermission="accounts:coa:view">
                            <ChartOfAccountsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="receipt"
                        element={
                          <ProtectedRoute requiredPermission="accounts:receipts:view">
                            <ReceiptPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="payment"
                        element={
                          <ProtectedRoute requiredPermission="accounts:payments:view">
                            <PaymentVoucherPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="account-statement"
                        element={
                          <ProtectedRoute requiredPermission="accounts:account_statement:view">
                            <AccountStatementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="trial-balance"
                        element={
                          <ProtectedRoute requiredPermission="accounts:trial_balance:view">
                            <TrialBalancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="balance-sheet"
                        element={
                          <ProtectedRoute requiredPermission="accounts:balance_sheet:view">
                            <BalanceSheetPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="profit-loss"
                        element={
                          <ProtectedRoute requiredPermission="accounts:profit_loss:view">
                            <ProfitLossPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="receipt-report"
                        element={
                          <ProtectedRoute requiredPermission="accounts:receipt_report:view">
                            <ReceiptReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="payment-report"
                        element={
                          <ProtectedRoute requiredPermission="accounts:payment_report:view">
                            <PaymentReportPage />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="vat-in-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:vat_in">
                            <PurchaseVatReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="vat-out-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:vat_out">
                            <SalesVatReport />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="day-report"
                        element={
                          <ProtectedRoute requiredPermission="accounts:day_report:view">
                            <DayReportPage />
                          </ProtectedRoute>
                        }
                      />
                    </Route>
                  </Route>

                  <Route
                    element={<ProtectedRoute requiredPermission="invoice" />}
                  >
                    <Route
                      path=":portalRole/invoice"
                      element={<UnifiedInvoiceEntry />}
                    />
                  </Route>
                </Route>
              </Route>

            {/* User Routes with UserLayout (Home, Services, Booking Flow, Account) */}
            <Route element={<UserLayout />}>
              <Route path="/" element={<RootHome />} />
              <Route path="/user/home" element={<UserHome />} />
              <Route path="/user/gallery" element={<ShopGallery />} />
              <Route path="/user/search" element={<SearchScreen />} />
              <Route path="/user/location" element={<LocationPicker />} />
              <Route path="/user/product-checkout/:productId" element={<ProductCheckout />} />
              <Route path="/user/cart-checkout" element={<CartCheckout />} />
              <Route path="/user/product/:productId" element={<ProductDetail />} />
              <Route path="/user/cart" element={<Cart />} />

              {/* Protected User Account Routes */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["user", "admin", "SHOP_ADMIN", "staff"]}
                  />
                }
              >
                <Route path="/user/profile" element={<UserProfile />} />
                <Route path="/user/profile/edit" element={<EditProfile />} />
                <Route path="/user/profile/address" element={<EditAddress />} />
                <Route path="/user/profile/details" element={<EditProfileDetails />} />
                <Route path="/user/favourites" element={<Favourites />} />
              </Route>

              {/* Legacy /:shopSlug/user/* routes compatibility */}
              <Route path="/:shopSlug/user/home" element={<UserHome />} />
              <Route path="/:shopSlug/user/gallery" element={<ShopGallery />} />
              <Route path="/:shopSlug/user/product-checkout/:productId" element={<ProductCheckout />} />
              <Route path="/:shopSlug/user/cart-checkout" element={<CartCheckout />} />
              <Route path="/:shopSlug/user/product/:productId" element={<ProductDetail />} />
              <Route path="/:shopSlug/user/cart" element={<Cart />} />
              <Route path="/:shopSlug/user/profile" element={<UserProfile />} />
              <Route path="/:shopSlug/user/profile/edit" element={<EditProfile />} />
              <Route path="/:shopSlug/user/profile/address" element={<EditAddress />} />
              <Route path="/:shopSlug/user/profile/details" element={<EditProfileDetails />} />
              <Route path="/:shopSlug/user/favourites" element={<Favourites />} />
            </Route>

            {/* Legacy Portal URL redirects (e.g. /legacy/admin/dashboard -> /admin/dashboard) */}
            <Route path="/:shopSlug/:portalRole/*" element={<LegacyPortalRedirect />} />

            {/* Public Authentication & Info Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/:shopSlug/login" element={<Navigate to="/login" replace />} />
            <Route path="/:shopSlug/register" element={<Navigate to="/register" replace />} />
            <Route path="/:shopSlug/forgot-password" element={<Navigate to="/forgot-password" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/privacy-polict" element={<Navigate to="/privacy-policy" replace />} />
            <Route path="/terms-and-conditions" element={<TermsConditionsPage />} />
            <Route path="/:shopSlug" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ThemeProviderInner>
      </AuthProvider>
    </Router>
  );
}

export default App;
