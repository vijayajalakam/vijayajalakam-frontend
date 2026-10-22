
const getDynamicPortalPath = (shopSlug, portalRole, path) => {
    if (!path) return "";
    const cleanPath = path.replace(/^\/(admin|staff)/, "");
    const rolePrefix = `/${portalRole}`;

    if (shopSlug) {
        return `/${shopSlug}${rolePrefix}${cleanPath}`;
    }
    return `${rolePrefix}${cleanPath}`;
};

console.log("Scenario 1: shopSlug='salon-a', portalRole='admin', path='/admin/stock/services'");
console.log(getDynamicPortalPath('salon-a', 'admin', '/admin/stock/services'));

console.log("Scenario 2: shopSlug=null, portalRole='staff', path='/admin/stock/products'");
console.log(getDynamicPortalPath(null, 'staff', '/admin/stock/products'));

console.log("Scenario 3: shopSlug='salon-b', portalRole='staff', path='/staff/dashboard'");
console.log(getDynamicPortalPath('salon-b', 'staff', '/staff/dashboard'));
