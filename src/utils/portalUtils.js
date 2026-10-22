/**
 * Normalizes user roles to portal URL prefixes.
 * @param {string} role - The user's role from the auth object.
 * @returns {string} - The URL prefix (e.g., 'admin', 'shop-admin', 'staff').
 */
export const getPortalRole = (role) => {
    if (!role) return "admin";

    const normalizedRole = role.toLowerCase().replace(/_/g, "-");

    if (normalizedRole === "staff") return "staff";
    if (normalizedRole === "shop-admin") return "shop-admin";
    if (normalizedRole === "admin" || normalizedRole === "super-admin") return "admin";
    if (normalizedRole === "user" || normalizedRole === "customer") return "user";

    return "user"; // Default fallback for safety (customers)
};

/**
 * Generates a full path including shop slug and portal role.
 * @param {string} shopSlug - The current shop's unique identifier.
 * @param {string} portalRole - The normalized portal role prefix.
 * @param {string} path - The relative path within the portal.
 * @returns {string} - The full application path.
 */
export const getDynamicPortalPath = (shopSlug, portalRole, path = "") => {
    // If path already starts with the portal role, don't duplicate it
    const cleanPath = path.replace(/^\/(admin|staff|shop-admin)/, "");
    const base = shopSlug ? `/${shopSlug}/${portalRole}` : `/${portalRole}`;

    // Ensure path starts with / if it's not empty
    const formattedPath = cleanPath.startsWith("/") ? cleanPath : (cleanPath ? `/${cleanPath}` : "");

    return `${base}${formattedPath}`;
};
