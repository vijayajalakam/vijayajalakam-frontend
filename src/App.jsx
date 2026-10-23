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
import StaffManager from "./features/appointments/pages/StaffManager";
import HRMPage from "./features/appointments/pages/HRMPage";
import PayrollPage from "./features/appointments/pages/PayrollPage";
import AttendanceManager from "./features/appointments/pages/AttendanceManager";
import ServicesManager from "./features/appointments/pages/ServicesManager";
import BookingsPage from "./features/appointments/pages/BookingsPage";
import SlotManager from "./features/appointments/pages/SlotManager";
import ServicePage from "./features/appointments/pages/ServicePage";
import InvoicesPage from "./features/sales/pages/InvoicesPage";
import CustomerManager from "./features/crm/pages/CustomerManager";
import CRMPage from "./features/crm/pages/CRMPage";
import CustomerGroupManager from "./features/crm/pages/CustomerGroupManager";
import LoyaltyPointsManager from "./features/crm/pages/LoyaltyPointsManager";
import ShopManager from "./features/settings/pages/ShopManager";
import PrinterSettings from "./features/settings/pages/PrinterSettings";
import DayClosingSettings from "./features/settings/pages/DayClosingSettings";
import ConfigurationSettings from "./features/settings/pages/ConfigurationSettings";
import SettingsPage from "./features/settings/pages/SettingsPage";
import AdminProfile from "./features/auth/pages/AdminProfile";
import EditProfile from "./features/booking/pages/EditProfile";
import EditAddress from "./features/booking/pages/EditAddress";
import EditProfileDetails from "./features/booking/pages/EditProfileDetails";
import SelectServices from "./features/booking/pages/SelectServices";
import SelectProfessional from "./features/booking/pages/SelectProfessional";
import SelectDateTime from "./features/booking/pages/SelectDateTime";
import ReviewBooking from "./features/booking/pages/ReviewBooking";
import ConfirmAndPay from "./features/booking/pages/ConfirmAndPay";
import AppointmentConfirmed from "./features/booking/pages/AppointmentConfirmed";
import BookingDetails from "./features/booking/pages/BookingDetails";
import ReportsPage from "./features/reports/pages/ReportsPage";
import InvoiceReport from "./features/reports/pages/InvoiceReport";
import SalesMarginReport from "./features/reports/pages/SalesMarginReport";
import StaffCommissionReport from "./features/reports/pages/StaffCommissionReport";
import StaffRevenueReportPage from "./features/reports/pages/StaffRevenueReportPage";
import CustomerInvoiceReport from "./features/reports/pages/CustomerInvoiceReport";
import PendingInvoices from "./features/reports/pages/PendingInvoices";
import ProfitLossReport from "./features/reports/pages/ProfitLossReport";
import LoyaltyPointReport from "./features/reports/pages/LoyaltyPointReport";
import CancellationReport from "./features/reports/pages/CancellationReport";
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
import ServiceAttributes from "./features/appointments/pages/ServiceAttributes";
import AppointmentAnalyticsReport from "./features/reports/pages/AppointmentAnalyticsReport";
import MorePage from "./features/settings/pages/MorePage";
import DocumentSettings from "./features/settings/pages/DocumentSettings";
import PrivilegeManagement from "./features/settings/pages/PrivilegeManagement";
import PrivilegeForm from "./features/settings/pages/PrivilegeForm";
import BookingDisplayPage from "./features/settings/pages/BookingDisplayPage";
import SalesTaxReport from "./features/reports/pages/SalesTaxReport";
import SalesVatReport from "./features/reports/pages/SalesVatReport";
import ServiceProfitReport from "./features/reports/pages/ServiceProfitReport";
import ItemProfitReport from "./features/reports/pages/ItemProfitReport";
import QrCodePage from "./features/settings/pages/QrCodePage";
import ComplaintsPage from "./features/settings/pages/ComplaintsPage";
import BusinessStatusReportPage from "./features/reports/pages/BusinessStatusReportPage";
import ReviewSettingsPage from "./features/settings/pages/ReviewSettingsPage";
import IntegrationsPage from "./features/settings/pages/IntegrationsPage";
import WhatsAppSettings from "./features/settings/pages/WhatsAppSettings";
import SmtpSettingsPage from "./features/settings/pages/SmtpSettingsPage";
import PreviewsPage from "./features/settings/pages/PreviewsPage";


// Stock Module
import StockPage from "./features/inventory/pages/StockPage";
import PurchaseInvoicePage from "./features/purchases/pages/PurchaseInvoicePage";
import PurchaseReturnPage from "./features/purchases/pages/PurchaseReturnPage";
import DamageEntryPage from "./features/inventory/pages/DamageEntryPage";
import ConsumptionEntryPage from "./features/inventory/pages/ConsumptionEntryPage";
import StockAdjustmentPage from "./features/inventory/pages/StockAdjustmentPage";
import ProductMasterPage from "./features/inventory/pages/ProductMasterPage";
import SupplierManager from "./features/purchases/pages/SupplierManager";
import StockReportPage from "./features/inventory/pages/StockReportPage";
import PurchaseReportPage from "./features/purchases/pages/PurchaseReportPage";
import PurchaseReturnReportPage from "./features/purchases/pages/PurchaseReturnReportPage";
import SupplierCreditReportPageLegacy from "./features/purchases/pages/SupplierCreditReportPage";
import SupplierStatementPage from "./features/purchases/pages/SupplierStatementPage";
import DamageReportPage from "./features/inventory/pages/DamageReportPage";
import StockTransferPage from "./features/inventory/pages/StockTransferPage";
import PurchaseOrderPage from "./features/purchases/pages/PurchaseOrderPage";
import PurchaseEntryForm from "./features/purchases/pages/PurchaseEntryForm";
import PurchaseReturnForm from "./features/purchases/pages/PurchaseReturnForm";
import PurchaseOrderForm from "./features/purchases/pages/PurchaseOrderForm";
import StockTransferReportPage from "./features/inventory/pages/StockTransferReportPage";
import ConsumptionReportPage from "./features/inventory/pages/ConsumptionReportPage";
import PurchaseTaxReport from "./features/purchases/pages/PurchaseTaxReport";
import PurchaseVatReport from "./features/purchases/pages/PurchaseVatReport";

// Accounts Module
import AccountsPage from "./features/accounting/pages/AccountsPage";
import ChartOfAccountsPage from "./features/accounting/pages/ChartOfAccountsPage";
import {
  ReceiptPage,
  PaymentVoucherPage,
  ContraPage,
  JournalPage,
} from "./features/accounting/pages/TransactionPage";
import AccountStatementPage from "./features/accounting/pages/AccountStatementPage";
import TrialBalancePage from "./features/accounting/pages/TrialBalancePage";
import BalanceSheetPage from "./features/accounting/pages/BalanceSheetPage";
import ProfitLossPage from "./features/accounting/pages/ProfitLossPage";
import ReceiptReportPage from "./features/accounting/pages/ReceiptReportPage";
import PaymentReportPage from "./features/accounting/pages/PaymentReportPage";
import ContraReportPage from "./features/accounting/pages/ContraReportPage";
import JournalReportPage from "./features/accounting/pages/JournalReportPage";
import GSTReportPage from "./features/accounting/pages/GSTReportPage";
import DayReportPage from "./features/accounting/pages/DayReportPage";

import BookingsTimeline from "./features/appointments/pages/Bookings";
import UnifiedInvoiceEntry from "./features/sales/pages/UnifiedInvoiceEntry";
import BookAppointment from "./features/booking/pages/BookAppointment";
import MyBookings from "./features/booking/pages/MyBookings";
import UserHome from "./features/booking/pages/UserHome";
import ShopGallery from "./features/booking/pages/ShopGallery";
import UserProfile from "./features/booking/pages/UserProfile";
import Favourites from "./features/booking/pages/Favourites";
import BookingCheckout from "./features/booking/pages/BookingCheckout";
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
    if (rolePrefix === "staff") return <Navigate to="/staff/bookings" replace />;
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
            <Route path="/staff" element={<Navigate to="/staff/bookings" replace />} />

            {/* Admin & Staff Protected Routes with Sidebar Layout */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "staff", "SHOP_ADMIN"]}
                />
              }
            >
                {/* Standalone Full-Screen Routes */}
                <Route
                  path=":portalRole/settings/more/booking-display"
                  element={
                    <ProtectedRoute requiredPermission="settings:more:booking_display:view">
                      <BookingDisplayPage />
                    </ProtectedRoute>
                  }
                />

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
                        path="more/configuration"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:configuration:view">
                            <ConfigurationSettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="manage"
                        element={
                          <ProtectedRoute requiredPermission="settings:manage">
                            <ServiceAttributes />
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
                        path="more/complaints"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:complaints:view">
                            <ComplaintsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/service-reviews"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:reviews:view">
                            <ReviewSettingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/product-reviews"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:reviews:view">
                            <ReviewSettingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="more/reviews"
                        element={
                          <ProtectedRoute requiredPermission="settings:more:reviews:view">
                            <ReviewSettingsPage />
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
                        path="booking-cancellation"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:cancellation_report">
                            <CancellationReport />
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
                        path="bookings"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:bookings_report">
                            <BookingsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="appointment-analytics"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:appointment_analytics">
                            <AppointmentAnalyticsReport />
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
                        path="service-profit-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:sales:service_profit_report">
                            <ServiceProfitReport />
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
                        path="purchase-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:purchase_report">
                            <PurchaseReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="purchase-tax"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:purchase_tax_report">
                            <PurchaseTaxReport />
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
                        path="return-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:purchase_return_report">
                            <PurchaseReturnReportPage />
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
                            <DamageReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="transfer-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:stock_transfer_report">
                            <StockTransferReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="consumption-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:stock:consumption_report">
                            <ConsumptionReportPage />
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
                        path="contra-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:contra_report">
                            <ContraReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="journal-report"
                        element={
                          <ProtectedRoute requiredPermission="reports:accounts:journal_report">
                            <JournalReportPage />
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

                  <Route
                    element={<ProtectedRoute requiredPermission="services" />}
                  >
                    <Route path=":portalRole/services" element={<ServicePage />}>
                      <Route
                        path="list"
                        element={
                          <ProtectedRoute requiredPermission="services:general:view">
                            <ServicesManager />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="slots"
                        element={
                          <ProtectedRoute requiredPermission="services:slots:general:view">
                            <SlotManager />
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
                        path="purchase-order"
                        element={
                          <ProtectedRoute requiredPermission="stock:purchase_orders:view">
                            <PurchaseOrderPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="purchase-invoice"
                        element={
                          <ProtectedRoute requiredPermission="stock:purchase_invoices:view">
                            <PurchaseInvoicePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="purchase-return"
                        element={
                          <ProtectedRoute requiredPermission="stock:purchase_returns:view">
                            <PurchaseReturnPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="stock-transfer"
                        element={
                          <ProtectedRoute requiredPermission="stock:stock_transfer:view">
                            <StockTransferPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="damage-entry"
                        element={
                          <ProtectedRoute requiredPermission="stock:damage_entry:view">
                            <DamageEntryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="consumption-entry"
                        element={
                          <ProtectedRoute requiredPermission="stock:consumption_entry:view">
                            <ConsumptionEntryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="stock-adjustment"
                        element={
                          <ProtectedRoute requiredPermission="stock:stock_adjustment:view">
                            <StockAdjustmentPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="purchase-invoice/new"
                        element={<PurchaseEntryForm />}
                      />
                      <Route
                        path="purchase-invoice/edit/:id"
                        element={<PurchaseEntryForm />}
                      />
                      <Route
                        path="purchase-return/new"
                        element={<PurchaseReturnForm />}
                      />
                      <Route
                        path="purchase-return/edit/:id"
                        element={<PurchaseReturnForm />}
                      />
                      <Route
                        path="purchase-order/new"
                        element={<PurchaseOrderForm />}
                      />
                      <Route
                        path="purchase-order/edit/:id"
                        element={<PurchaseOrderForm />}
                      />
                      <Route
                        path="stock-report"
                        element={<StockReportPage />}
                      />
                      <Route
                        path="purchase-report"
                        element={<PurchaseReportPage />}
                      />
                      <Route
                        path="return-report"
                        element={<PurchaseReturnReportPage />}
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
                        element={<DamageReportPage />}
                      />
                      <Route
                        path="transfer-report"
                        element={<StockTransferReportPage />}
                      />
                      <Route
                        path="consumption-report"
                        element={<ConsumptionReportPage />}
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
                        path="contra"
                        element={
                          <ProtectedRoute requiredPermission="accounts:contra:view">
                            <ContraPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="journal"
                        element={
                          <ProtectedRoute requiredPermission="accounts:journal:view">
                            <JournalPage />
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
                        path="contra-report"
                        element={
                          <ProtectedRoute requiredPermission="accounts:contra_report:view">
                            <ContraReportPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="journal-report"
                        element={
                          <ProtectedRoute requiredPermission="accounts:journal_report:view">
                            <JournalReportPage />
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
                    element={<ProtectedRoute requiredPermission="bookings" />}
                  >
                    <Route path=":portalRole/bookings" element={<BookingsTimeline />} />
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
              <Route path="/user/select-services" element={<SelectServices />} />
              <Route path="/user/select-professional" element={<SelectProfessional />} />
              <Route path="/user/select-datetime" element={<SelectDateTime />} />
              <Route path="/user/review-booking" element={<ReviewBooking />} />
              <Route path="/user/confirm-pay" element={<ConfirmAndPay />} />
              <Route path="/user/appointment-confirmed" element={<AppointmentConfirmed />} />
              <Route path="/user/booking/:appointmentId" element={<BookingDetails />} />
              <Route path="/user/checkout/:serviceId" element={<BookingCheckout />} />
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
                <Route path="/user/bookings" element={<MyBookings />} />
                <Route path="/user/favourites" element={<Favourites />} />
              </Route>

              {/* Legacy /:shopSlug/user/* routes compatibility */}
              <Route path="/:shopSlug/user/home" element={<UserHome />} />
              <Route path="/:shopSlug/user/gallery" element={<ShopGallery />} />
              <Route path="/:shopSlug/user/select-services" element={<SelectServices />} />
              <Route path="/:shopSlug/user/select-professional" element={<SelectProfessional />} />
              <Route path="/:shopSlug/user/select-datetime" element={<SelectDateTime />} />
              <Route path="/:shopSlug/user/review-booking" element={<ReviewBooking />} />
              <Route path="/:shopSlug/user/confirm-pay" element={<ConfirmAndPay />} />
              <Route path="/:shopSlug/user/appointment-confirmed" element={<AppointmentConfirmed />} />
              <Route path="/:shopSlug/user/booking/:appointmentId" element={<BookingDetails />} />
              <Route path="/:shopSlug/user/checkout/:serviceId" element={<BookingCheckout />} />
              <Route path="/:shopSlug/user/product-checkout/:productId" element={<ProductCheckout />} />
              <Route path="/:shopSlug/user/cart-checkout" element={<CartCheckout />} />
              <Route path="/:shopSlug/user/product/:productId" element={<ProductDetail />} />
              <Route path="/:shopSlug/user/cart" element={<Cart />} />
              <Route path="/:shopSlug/user/profile" element={<UserProfile />} />
              <Route path="/:shopSlug/user/profile/edit" element={<EditProfile />} />
              <Route path="/:shopSlug/user/profile/address" element={<EditAddress />} />
              <Route path="/:shopSlug/user/profile/details" element={<EditProfileDetails />} />
              <Route path="/:shopSlug/user/bookings" element={<MyBookings />} />
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
