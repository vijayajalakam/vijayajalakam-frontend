import { Package } from "lucide-react";

export const inventorySidebarConfig = {
  label: "Stock",
  path: "/admin/stock",
  icon: Package,
  roles: ["admin", "SHOP_ADMIN"],
  permission: "stock",
};
