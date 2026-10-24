import { Package } from "lucide-react";

export const stockSidebarConfig = {
  label: "Stock",
  path: "/admin/stock",
  icon: Package,
  roles: ["admin", "SHOP_ADMIN"],
  permission: "stock",
};

export const inventorySidebarConfig = stockSidebarConfig;
