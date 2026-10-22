/** Normalizers for tenant API JSON: `{ success, data }`. */

export const asList = (res) => (res?.success ? res.data : []);

export const asData = (res) => (res?.success ? res.data : null);

export const passthrough = (res) => res;

/** RTK Query / unwrap rejection message helper */
export const rtkErrorMessage = (err, fallback = "Something went wrong") =>
  err?.data?.message ||
  err?.error?.data?.message ||
  err?.message ||
  fallback;
