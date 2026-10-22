import api from "../api/axiosInstance";

/** RTK Query base query using the tenant-aware axios instance (refresh + slug headers). */
export const axiosBaseQuery =
  () =>
  async ({ url, method = "GET", data, params, headers }) => {
    try {
      // If data is FormData, let axios auto-set the Content-Type (multipart/form-data with boundary)
      const config = { url, method, data, params, headers };
      if (data instanceof FormData) {
        if (config.headers) {
          delete config.headers["Content-Type"];
        }
      }
      const result = await api(config);
      return { data: result.data };
    } catch (err) {
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data ?? err.message,
        },
      };
    }
  };
