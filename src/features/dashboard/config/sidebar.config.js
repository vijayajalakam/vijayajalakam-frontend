import { LayoutDashboard } from "lucide-react";

export const dashboardSidebarConfig = {
  label: "Dashboard",
  path: "/admin/dashboard",
  icon: LayoutDashboard,
  roles: ["admin", "staff", "SHOP_ADMIN"],
  permission: "dashboard",
};
