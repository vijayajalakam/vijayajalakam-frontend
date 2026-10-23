/**
 * Normalizes user roles to portal URL prefixes.
 * @param {string} role - The user's role from the auth object.
 * @returns {string} - The URL prefix ('admin', 'staff', 'user').
 */
export const getPortalRole = (role) => {
    if (!role) return "admin";
    const normalizedRole = role.toLowerCase().replace(/_/g, "-");

    if (normalizedRole === "staff") return "staff";
    if (normalizedRole === "user" || normalizedRole === "customer") return "user";
    return "admin"; // Default for admin, shop-admin, etc.
};

/**
 * Generates a clean full path for single-salon routing.
 * Admin paths start with /admin and staff paths start with /staff.
 * @param {string} _shopSlug - Unused in single-salon mode.
 * @param {string} portalRole - The normalized portal role prefix ('admin' or 'staff').
 * @param {string} path - The relative path within the portal.
 * @returns {string} - The full application path (e.g. /admin/dashboard).
 */
export const getDynamicPortalPath = (_shopSlug, portalRole, path = "") => {
    const role = (portalRole === "staff") ? "staff" : "admin";
    const cleanPath = path.replace(/^\/(admin|staff|shop-admin)/, "");
    const formattedPath = cleanPath.startsWith("/") ? cleanPath : (cleanPath ? `/${cleanPath}` : "");
    return `/${role}${formattedPath}`;
};
