import { Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { getPortalRole } from "../../../utils/portalUtils";

const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { user, loading, hasPermission } = useAuth();
  const { shopSlug } = useParams();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!user) {
    const redirectPath = shopSlug ? `/${shopSlug}/login` : "/login";
    return <Navigate to={redirectPath} replace />;
  }

  if (user && (user.role === "SHOP_ADMIN" || user.role === "staff")) {
    const userShopSlug = user.shopSlug;
    if (shopSlug && userShopSlug && shopSlug !== userShopSlug) {
      const portalRole = getPortalRole(user.role);
      if (portalRole === "staff") {
        return <Navigate to={`/${userShopSlug}/staff/bookings`} replace />;
      } else {
        return <Navigate to={`/${userShopSlug}/${portalRole}/dashboard`} replace />;
      }
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const homePath = shopSlug ? `/${shopSlug}` : "/";
    return <Navigate to={homePath} replace />;
  }

  if (requiredPermission && user.role !== "SUPER_ADMIN" && user.role !== "SHOP_ADMIN" && user.role !== "admin") {
    if (!hasPermission || !hasPermission(requiredPermission)) {
      const portalRole = getPortalRole(user.role);
      const dashboardPath = shopSlug
        ? `/${shopSlug}/${portalRole}/dashboard`
        : `/${portalRole}/dashboard`;
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
