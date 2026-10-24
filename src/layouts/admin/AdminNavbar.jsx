import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Menu, ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { adminMenu } from "./adminMenu.config";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { getDynamicPortalPath } from "../../utils/portalUtils";
import DayCloseWidget from "../../features/settings/components/DayCloseWidget";

const AdminNavbar = ({
  className = "",
  onMenuClick,
  menuItems = adminMenu,
  portalLabel,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { shopSlug, portalRole: urlPortalRole } = useParams();
  const { portalRole: authPortalRole } = useAuth();
  // Use the portalRole from the URL as ground truth (handles SHOP_ADMIN using /admin/ URLs)
  const portalRole = urlPortalRole || authPortalRole;
  // Derive title and breadcrumbs
  const path = location.pathname;
  const sortedMenu = [...menuItems].sort(
    (a, b) => b.path.length - a.path.length,
  );
  const menuMatch = sortedMenu.find((m) => {
    const dynamicPath = getDynamicPortalPath(shopSlug, portalRole, m.path);
    return path === dynamicPath || path.startsWith(dynamicPath + "/");
  });
  const pageTitle = menuMatch ? menuMatch.label : "Dashboard";
  const displayPortalLabel = portalLabel || pageTitle;

  const matchedBase = menuMatch ? getDynamicPortalPath(shopSlug, portalRole, menuMatch.path) : "";
  let firstSegmentPath = "";
  let secondSegmentPath = "";

  // Build a meaningful screenName from the path segments after the matched menu path
  let screenName = "Overview";
  if (menuMatch) {
    const remainder = path.slice(matchedBase.length).replace(/^\//, "");
    if (remainder) {
      // Take the first meaningful segment (e.g. "purchase-order" from "purchase-order/new")
      const firstSegment = remainder.split("/")[0];
      firstSegmentPath = `${matchedBase}/${firstSegment}`;
      // Skip generic segments like "new", "edit", numeric IDs
      const isGeneric = /^(new|edit|\d+)$/.test(firstSegment);
      if (!isGeneric) {
        screenName = firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).replace(/-/g, " ");
      } else {
        // If first segment is generic, check if there's a parent segment
        const allSegments = remainder.split("/").filter(Boolean);
        // Find the last non-generic, non-ID segment
        const meaningful = allSegments.filter(s => !/^(new|edit|\d+|[a-f0-9]{24})$/.test(s));
        if (meaningful.length > 0) {
          const seg = meaningful[meaningful.length - 1];
          screenName = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
        }
      }
    }
  } else {
    const segments = path.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";
    screenName = lastSegment
      ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ")
      : "Overview";
    if (
      screenName.toLowerCase() === "admin" ||
      screenName.toLowerCase() === "dashboard" ||
      screenName.toLowerCase() === "staff"
    ) {
      screenName = "Overview";
    }
  }

  // Extract sub-screen from URL segments
  let subScreenName = "";
  if (menuMatch) {
    const remainder = path.slice(matchedBase.length).replace(/^\//, "");
    const allSegments = remainder.split("/").filter(Boolean);
    if (allSegments.length > 1) {
      const secondSegment = allSegments[1];
      secondSegmentPath = `${matchedBase}/${allSegments[0]}/${secondSegment}`;
      const isGeneric = /^(new|edit|\d+|[a-f0-9]{24})$/.test(secondSegment);
      if (!isGeneric) {
        subScreenName = secondSegment.charAt(0).toUpperCase() + secondSegment.slice(1).replace(/-/g, " ");
        subScreenName = subScreenName.replace(/([A-Z])/g, ' $1').trim();
      }
    }
  }

  // Extract hash screen
  let tertiaryScreenName = "";
  if (location.hash) {
    const hashStr = location.hash.replace("#", "");
    const formattedHash = hashStr.charAt(0).toUpperCase() + hashStr.slice(1).replace(/-/g, " ").replace(/([A-Z])/g, ' $1').trim();
    
    if (subScreenName) {
      tertiaryScreenName = formattedHash;
    } else {
      subScreenName = formattedHash;
    }
  }

  return (
    <header
      className={`z-50 h-16 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface transition-colors duration-300 ${className}`}
    >
      <div className="flex items-center justify-between h-full px-4 md:px-8">
        {/* Left section: Title & Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-brand-primary lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden lg:flex items-center gap-1.5 lg:-ml-2">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors focus:outline-none focus:ring-0"
              title="Go Back"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => navigate(1)} 
              className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card transition-colors focus:outline-none focus:ring-0"
              title="Go Forward"
            >
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex flex-col">
            <h1 className="text-lg font-black text-gray-900 dark:text-white leading-none">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Link to={matchedBase || "#"} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-brand-primary transition-colors uppercase tracking-widest">
                {displayPortalLabel}
              </Link>
              <ChevronRight
                size={10}
                className="text-gray-300 dark:text-gray-600"
              />
              <Link to={firstSegmentPath || "#"} className={`text-[10px] font-bold ${subScreenName ? 'text-gray-400 dark:text-gray-500 hover:text-brand-primary transition-colors' : 'text-gray-500 dark:text-gray-400'} uppercase tracking-widest`}>
                {screenName}
              </Link>
              {subScreenName && (
                <>
                  <ChevronRight
                    size={10}
                    className="text-gray-300 dark:text-gray-600"
                  />
                  {tertiaryScreenName ? (
                    <Link to={secondSegmentPath || firstSegmentPath || "#"} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-brand-primary transition-colors uppercase tracking-widest">
                      {subScreenName}
                    </Link>
                  ) : (
                    <span className="text-[10px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest">
                      {subScreenName}
                    </span>
                  )}
                </>
              )}
              {tertiaryScreenName && (
                <>
                  <ChevronRight
                    size={10}
                    className="text-gray-300 dark:text-gray-600"
                  />
                  <span className="text-[10px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest">
                    {tertiaryScreenName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-4 md:gap-6 relative">
          <div className="hidden sm:block shrink-0">
            <DayCloseWidget />
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
