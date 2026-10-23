import { useState, useEffect } from "react";
import { useNavigate, useParams, Outlet, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import AdminSidebar from "./adminSidebar/AdminSidebar";
import AdminNavbar from "./AdminNavbar";
import AdminBottomNav from "./AdminBottomNav";
import ChatAssistant from "../../components/shared/ChatAssistant";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { useBookingAlert } from "../../hooks/useBookingAlert";
import BookingAlertFooter from "../../components/shared/BookingAlertFooter";
import { clearBadgeCount } from "../../store/slices/bookingBadgeSlice";

const AdminLayout = () => {
  const { user, hasPermission, shopConfig, portalRole, sidebarDefaultExpanded } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { shopSlug } = useParams();
  const dispatch = useDispatch();

  const isAdminBookings = location.pathname.includes("/bookings") && !location.pathname.includes("/user/");
  
  useEffect(() => {
    if (isAdminBookings) {
      dispatch(clearBadgeCount());
    }
  }, [isAdminBookings, dispatch]);

  // Shortcut: Ctrl+I to go to New Invoice
  useKeyboardShortcut(
    "i",
    () => {
      if (hasPermission("invoice")) {
        const targetPath = shopSlug
          ? `/${shopSlug}/${portalRole}/invoice`
          : `/${portalRole}/invoice`;

        if (location.pathname !== targetPath) {
          navigate(targetPath);
        }
      }
    },
    {
      ctrl: true,
    },
  );

  const isInvoicePage =
    location.pathname.endsWith("/invoice") ||
    location.pathname.includes("/invoice/");
  const isImmersive =
    location.pathname.includes("/settings/more/booking-display") ||
    location.pathname.includes("/settings/more/privileges/new") ||
    location.pathname.includes("/settings/more/privileges/edit");


  const isDashboard =
    location.pathname.endsWith("/dashboard") ||
    location.pathname.includes("/dashboard/");
  const isReportsDashboard =
    location.pathname.endsWith("/reports") ||
    location.pathname.endsWith("/reports/");
  const [sidebarOpen, setSidebarOpen] = useState(sidebarDefaultExpanded !== undefined ? sidebarDefaultExpanded : true);
  const [isMobile, setIsMobile] = useState(false);

  const shopIdStr = shopConfig?.shopId || shopConfig?._id || (typeof user?.shopId === 'object' ? user?.shopId?._id : user?.shopId);
  const isAlertEnabled = !!(user && shopIdStr);

  const { alert: bookingAlert, dismiss: dismissBookingAlert } = useBookingAlert({
    shopIdStr,
    enabled: isAlertEnabled,
    isAdminBookings,
  });

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      
      // On mobile, always close. On desktop, follow the saved preference.
      if (mobile) {
        setSidebarOpen(false);
      } else if (sidebarDefaultExpanded !== undefined) {
        setSidebarOpen(sidebarDefaultExpanded);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [sidebarDefaultExpanded]);

  useEffect(() => {
    const setSaasMetaTitleWithLogo = () => {
      const displayTitle = shopConfig?.shopName
        ? `${shopConfig?.shopName}`
        : "Vijayajalakam";
      const logo = shopConfig?.logo || null;
      console.log("logo", logo);

      document.title = displayTitle;

      if (logo) {
        let link = document.querySelector("link[rel~='icon']");
        //⚠️⚠️ CODE IF NO FAVICON EXIST. BUT WE ALREADY HAVE COMPANY FAVICON. THEREFORE COMMENTED THE CODE ⚠️⚠️
        // if (!link) {
        //   link = document.createElement("link");
        //   link.rel = "icon";
        //   document.head.appendChild(link);
        // }

        link.type = "image/png"; // adjust if jpg/svg
        link.href = logo;
      }
    };
    setSaasMetaTitleWithLogo();
  });

  // const { logout, user, shopConfig, hasPermission, portalRole } = useAuth();
  //
  //  {shopConfig?.logo ? (
  //   <img
  //     src={shopConfig.logo}
  //     alt={displayTitle}
  //     className="h-10 w-auto object-contain max-w-[140px]"
  //   />
  // ) : (
  //   <span className="font-bold text-gray-900 dark:text-white tracking-tight text-lg">
  //     {displayTitle}
  //   </span>
  // )}

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const isReportsSubPage = location.pathname.includes("/reports/");

  const removePadding =
    isInvoicePage ||
    isReportsDashboard ||
    isReportsSubPage ||
    location.pathname.includes("/stock") ||
    location.pathname.includes("/accounts") ||
    location.pathname.includes("/services") ||
    location.pathname.includes("/crm") ||
    location.pathname.includes("/hrm") ||
    location.pathname.includes("/settings");

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-gray-50 dark:bg-dark-bg font-sans antialiased transition-colors duration-300">
      {/* Full-screen pages: no sidebar, no navbar, no bottom nav */}
      {isImmersive ? (
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
          <BookingAlertFooter
            alert={bookingAlert}
            onDismiss={dismissBookingAlert}
            currencySymbol={shopConfig?.currency?.symbol || "₹"}
            isMobile={isMobile}
          />
        </main>
      ) : (
        <>
          {/* Sidebar */}
          <AdminSidebar
            isOpen={sidebarOpen}
            setOpen={setSidebarOpen}
            isMobile={isMobile}
            onClose={closeSidebar}
          />

          {/* Right-side container: Navbar + Content */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
            <AdminNavbar
              onMenuClick={toggleSidebar}
              sidebarOpen={sidebarOpen}
            />

            <main
              className={`flex-1 overflow-y-auto overflow-x-hidden bg-gray-50/50 dark:bg-dark-bg/50 transition-colors duration-300 flex flex-col ${removePadding ? "p-0" : "p-4 md:p-6"} ${isMobile ? "pb-20" : ""}`}
            >
              <Outlet />
            </main>

            {isDashboard &&
              (user?.role === "SUPER_ADMIN" ||
                hasPermission("chatAssistant")) && <ChatAssistant />}

            {isMobile && <AdminBottomNav />}

            <BookingAlertFooter
              alert={bookingAlert}
              onDismiss={dismissBookingAlert}
              currencySymbol={shopConfig?.currency?.symbol || "₹"}
              isMobile={isMobile}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminLayout;
