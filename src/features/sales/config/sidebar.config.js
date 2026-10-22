import { FileText } from "lucide-react";

export const salesSidebarConfig = {
  label: "Invoice",
  path: "/invoice",  // Remove role prefix, getDynamicPortalPath will add it
  icon: FileText,
  roles: ["staff", "admin", "SHOP_ADMIN"],
  permission: "invoice",
};
