import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../../../api/axiosInstance";
import { isRTL, getLanguageConfig } from "../../../utils/languageUtils";
import { AuthContext } from "../config/AuthContext";
import { getPortalRole } from "../../../utils/portalUtils";
import {
  setEffectivePermissionKeys,
  clearPermissions,
  selectEffectivePermissionKeys,
} from "../../../store/slices/permissionSlice";
import { 
  setCredentials, 
  clearCredentials, 
  selectCurrentUser,
  fetchCurrentUser,
  updateUser as updateAuthUser 
} from "../../../store/slices/authSlice";
import { useGetPublicConfigQuery } from "../../../store/api/appApi";

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const _location = useLocation(); // Used to trigger re-render on route change
  const reduxPermissionKeys = useSelector(selectEffectivePermissionKeys);
  const user = useSelector(selectCurrentUser);
  const [loading, setLoading] = useState(true);

  const [salonConfig, setSalonConfig] = useState(null);

  // Extract tenant slug from URL for cache keying
  const getTenantSlug = () => {
    const pathParts = window.location.pathname.split("/");
    let slug = pathParts[1];
    if (["admin", "login", "register", "user", ""].includes(slug)) {
      return localStorage.getItem("lastShopSlug") || "default";
    }
    return slug || "default";
  };

  const tenantSlug = getTenantSlug();
  const { data: publicCfg, refetch: refetchPublicConfig } =
    useGetPublicConfigQuery(tenantSlug);

  useEffect(() => {
    if (!publicCfg) return;
    setSalonConfig(publicCfg);
    const isRtlLang = isRTL(publicCfg.language);
    const langCode = getLanguageConfig(publicCfg.language).code;
    document.dir = isRtlLang ? "rtl" : "ltr";
    document.body.dir = isRtlLang ? "rtl" : "ltr";
    document.documentElement.lang = langCode;
  }, [publicCfg]);

  const saveAuthData = (accessToken, user, shopSlug) => {
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    }
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
    if (shopSlug) {
      localStorage.setItem("lastShopSlug", shopSlug);
    }
  };

  const clearAuthData = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    localStorage.removeItem("lastShopSlug");
  };



  const checkAuth = async () => {
    // Check if user explicitly logged out
    const isLoggedOut = localStorage.getItem("isLoggedOut") === "true";
    if (isLoggedOut) {
      console.log("AuthProvider: User logged out, skipping auth check");
      clearAuthData();
      dispatch(clearCredentials());
      dispatch(clearPermissions());
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/auth/refresh");
      if (res.data.success) {
        const { accessToken } = res.data;
        setAccessToken(accessToken);
        // Now fetch user details
        const userRes = await api.get("/auth/me");
        const me = userRes.data.data;
        saveAuthData(accessToken, me);
        dispatch(setCredentials({ user: me, accessToken }));
        dispatch(
          setEffectivePermissionKeys(Array.isArray(me.privileges) ? me.privileges : []),
        );
      } else {
        throw new Error("Refresh failed");
      }
    } catch {
      clearAuthData();
      dispatch(clearCredentials());
      dispatch(clearPermissions());
    }
  };


  useEffect(() => {
    const init = async () => {
      // Check if user explicitly logged out
      const isLoggedOut = localStorage.getItem("isLoggedOut") === "true";
      if (isLoggedOut) {
        console.log("AuthProvider: User logged out, skipping initialization");
        setLoading(false);
        return;
      }

      // If we have a saved token, fetch the fresh profile immediately
      const token = localStorage.getItem("accessToken");
      console.log("AuthProvider: Init starting. Token found:", !!token);
      
      if (token) {
        setAccessToken(token);
        // Refresh profile data from server to ensure fresh image/data
        console.log("AuthProvider: Fetching fresh user profile...");
        const result = await dispatch(fetchCurrentUser());
        console.log("AuthProvider: Profile fetch result:", result.meta.requestStatus, result.payload);
      }

      await checkAuth();
      console.log("AuthProvider: checkAuth completed.");
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const setAccessToken = (token) => {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  const login = useCallback(async (email, password, shopSlug) => {
    console.log("AuthProvider: Attempting login...", { email, shopSlug });
    try {
      // Clear logout flag on login
      localStorage.removeItem("isLoggedOut");
      
      console.log("AuthProvider: Sending POST to /auth/login");
      const res = await api.post("/auth/login", { email, password });
      console.log("AuthProvider: Response received:", res.status, res.data);

      if (res.data.success) {
        const u = res.data.user;
        setAccessToken(res.data.accessToken);
        saveAuthData(res.data.accessToken, u, shopSlug);
        localStorage.setItem("loginTime", new Date().toISOString());

        dispatch(setCredentials({ user: u, accessToken: res.data.accessToken }));
        dispatch(
          setEffectivePermissionKeys(Array.isArray(u.privileges) ? u.privileges : []),
        );

        await refetchPublicConfig();

        return res.data.user;

      } else {
        console.warn("AuthProvider: Login failed (success=false)", res.data);
      }
    } catch (err) {
      console.error("AuthProvider: Login service error details:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        headers: err.response?.headers,
      });
      throw err;
    }
  }, [dispatch, refetchPublicConfig]);

  const googleLogin = useCallback(async (credential, shopSlug) => {
    // Clear logout flag on login
    localStorage.removeItem("isLoggedOut");
    
    const res = await api.post("/auth/google", { credential });
    if (res.data.success) {
      setAccessToken(res.data.accessToken);
      const u = res.data.user;
      
      saveAuthData(res.data.accessToken, u, shopSlug);
      localStorage.setItem("loginTime", new Date().toISOString());

      dispatch(setCredentials({ user: u, accessToken: res.data.accessToken }));
      dispatch(
        setEffectivePermissionKeys(Array.isArray(u.privileges) ? u.privileges : []),
      );
      await refetchPublicConfig();
      return res.data.user;
    }

  }, [dispatch, refetchPublicConfig]);

  const register = useCallback(async (userData, shopSlug) => {
    // Clear logout flag on registration
    localStorage.removeItem("isLoggedOut");
    
    const res = await api.post("/auth/register", userData);
    if (res.data.success) {
      setAccessToken(res.data.accessToken);
      const u = res.data.user;
      
      saveAuthData(res.data.accessToken, u, shopSlug);
      localStorage.setItem("loginTime", new Date().toISOString());

      dispatch(setCredentials({ user: u, accessToken: res.data.accessToken }));
      dispatch(
        setEffectivePermissionKeys(Array.isArray(u.privileges) ? u.privileges : []),
      );
      await refetchPublicConfig();
      return res.data.user;
    }

  }, [dispatch, refetchPublicConfig]);






  //==============================  FORGET PASSWORD PAGE APIS START ==============================
   async function SEND_EMAIL_OTP_API(obj){
      try {
          const res = await api.post('/auth/email/forget-password/send-otp',obj);
          return res?.data;
      } catch (error) {
          return {
            success:false,
            
            message:
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        "Failed to send OTP. Please try again later."
          }
      }
  }

 async function UPDATE_PASSWORD_FOR_FORGET_PASSWORD_API(obj){
      try {
          const res = await api.post('/auth/email/otp/update-password',obj);
          return res?.data;
      } catch (error) {
          return {
            success:false,
            message:
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        "Update password failed. Please try again later."
          }
      }
      
  }

  

   async function VERIFY_FORGET_PASSWORD_OTP_API(obj){
      try {
          const res = await api.post('/auth/email/verify/otp',obj);
          return res?.data;
      } catch (error) {
          // return {
          //   success:false,
          //   message:error instanceof Error ? error.message : "Failed to send OTP. Please try again later."
          // }
              return {
            success:false,
            message:
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        "Verification failed. Please try again later."
          }


      }
  }



//==============================  FORGET PASSWORD PAGE APIS END ==============================


  const logout = useCallback(async () => {
    try {
      console.log("AuthProvider: Logging out...");
      
      // Set logout flag FIRST before clearing anything
      localStorage.setItem("isLoggedOut", "true");
      
      // Call backend logout
      await api.post("/auth/logout");
      
      // Clear all auth data
      clearAuthData();
      dispatch(clearCredentials());
      dispatch(clearPermissions());
      delete api.defaults.headers.common["Authorization"];
      
      console.log("AuthProvider: Logout complete");
    } catch (err) {
      console.error("AuthProvider: Logout error:", err);
      // Even if backend call fails, clear local data
      localStorage.setItem("isLoggedOut", "true");
      clearAuthData();
      dispatch(clearCredentials());
      dispatch(clearPermissions());
      delete api.defaults.headers.common["Authorization"];
    }
  }, [dispatch]);

  const isAdmin = useMemo(() => {
    return user?.role === "admin" || user?.role === "SUPER_ADMIN";
  }, [user]);

  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      if (isAdmin) return true;

      const privileges =
        Array.isArray(user.privileges) && user.privileges.length > 0
          ? user.privileges
          : reduxPermissionKeys;

      if (!privileges?.length) return false;
      if (privileges.includes("*")) return true;

      return privileges.some(
        (p) =>
          p === permission ||
          permission.startsWith(`${p}:`) ||
          p.startsWith(`${permission}:`),
      );
    },
    [user, isAdmin, reduxPermissionKeys],
  );

  const portalRole = useMemo(() => {
    return getPortalRole(user?.role);
  }, [user]);


  
  const value = useMemo(
    () => ({
      user,
      login,
      googleLogin,
      register,
      logout,
      //------------- FROGET PASSWORD APIS --------------//
      VERIFY_FORGET_PASSWORD_OTP_API,
       UPDATE_PASSWORD_FOR_FORGET_PASSWORD_API,
       SEND_EMAIL_OTP_API,
      //------------- FROGET PASSWORD APIS --------------//

      loading,
      salonConfig,
      hasPermission,
      isAdmin,
      portalRole,
      refreshConfig: refetchPublicConfig,
      updateUser: (newData) => dispatch(updateAuthUser(newData)),
      currencySymbol: salonConfig?.currencySymbol || " ",
      decimalPrecision: salonConfig?.decimalPrecision !== undefined ? salonConfig.decimalPrecision : 2,
      language: salonConfig?.language || "English",
      country: salonConfig?.country || "India",
      sidebarStyle: salonConfig?.sidebarStyle || "classic",
      sidebarDefaultExpanded: salonConfig?.sidebarDefaultExpanded !== undefined ? salonConfig.sidebarDefaultExpanded : true,
      sidebarItemOrientation: salonConfig?.sidebarItemOrientation || "row",
      stockButtonsView: salonConfig?.stockButtonsView || "row",
      invoiceServiceCardView: salonConfig?.invoiceServiceCardView || "image-details",
      invoiceProductCardView: salonConfig?.invoiceProductCardView || "image-details",
      // Round-off settings
      enableRoundOff: salonConfig?.enableRoundOff || false,
      roundOffValue: salonConfig?.roundOffValue || 1,
      roundOffBenefit: salonConfig?.roundOffBenefit || "customer",
      defaultInvoicePaymentMethod:
        salonConfig?.defaultInvoicePaymentMethod || "CASH",
    }),
    [
      user,
      loading,
      salonConfig,
      login,
      googleLogin,
      register,
      logout,
      hasPermission,
      isAdmin,
      portalRole,
      refetchPublicConfig,
      dispatch,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
