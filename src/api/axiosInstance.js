import axios from "axios";

// Production API URL - hardcoded to ensure it works regardless of build environment
const PROD_API_URL = "https://api.vijayajalakam.com/api";
const LOCAL_API_URL = "http://localhost:5000/api";

const getBaseURL = () => {
  const hostname = window.location.hostname;

  // Production: any vijayajalakam.com domain (www.vijayajalakam.com, vijayajalakam.com, etc.)
  if (hostname.endsWith("vijayajalakam.com") || hostname.endsWith(".vercel.app")) {
    return PROD_API_URL;
  }

  // Development: localhost or 127.0.0.1
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return import.meta.env.VITE_API_URL_LOCAL || LOCAL_API_URL;
  }

  // LAN IP access (e.g., 192.168.x.x from mobile device) - point to backend on same host
  return `http://${hostname}:5000/api`;
};

// Socket URL helper - strips /api suffix for socket.io connections
export const getSocketURL = () => getBaseURL().replace("/api", "");

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // For cookies
});

// Initialize token from localStorage
const storedToken = localStorage.getItem("accessToken");
if (storedToken) {
  api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
}

// Request interceptor to add tenant slug
api.interceptors.request.use(
  (config) => {
    // Extract slug from URL: http://localhost:5173/toney-business/admin -> toney-business
    const pathParts = window.location.pathname.split("/");
    let slug = pathParts[1];

    // Reserved words that are NOT shop slugs - these are top-level routes
    const reservedSlugs = ["admin", "login", "register", "user", "forgot-password", "privacy-policy", "terms-and-conditions"];

    if (reservedSlugs.includes(slug) || !slug) {
      // Try to get slug from localStorage as fallback
      const storedSlug = localStorage.getItem("lastShopSlug");
      if (storedSlug) {
        slug = storedSlug;
      } else {
        slug = null;
      }
    } else {
      // Valid shop slug found in URL - persist it for future API calls
      // This ensures that even if the user navigates to a global route,
      // the last shop context is preserved
      localStorage.setItem("lastShopSlug", slug);
    }

    if (slug) {
      config.headers["x-tenant-slug"] = slug;
    }

    const token = api.defaults.headers.common["Authorization"];

    if (!token && !config.url.includes("/auth/")) {
      console.warn(
        "Axios: Requesting protected route without Authorization token!",
        config.url,
      );
    }

    return config;
  },
  (error) => {
    console.error("Axios: Request error:", error);
    return Promise.reject(error);
  },
);

// Interceptor for refreshing token could go here.
// For simplicity, we might handle 401 in AuthProvider or components.
// But implemented interceptor is better.

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Catch Shop Disabled Error
    if (
      error.response?.status === 403 &&
      error.response?.data?.message === "SHOP_DISABLED"
    ) {
      window.dispatchEvent(new Event("shop-disabled"));
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        originalRequest.url.includes("/auth/refresh") ||
        originalRequest.url.includes("/auth/login") ||
        originalRequest.url.includes("/auth/register") ||
        originalRequest.url.includes("/auth/google")
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          },
        );

        if (res.data.success) {
          const accessToken = res.data.accessToken;
          api.defaults.headers.common["Authorization"] =
            `Bearer ${accessToken}`;
          processQueue(null, accessToken);

          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (err) {
        processQueue(err, null);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
