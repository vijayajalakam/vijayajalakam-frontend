import { BarChart3 } from "lucide-react";

export const reportsSidebarConfig = {
  label: "Reports",
  path: "/admin/reports",
  icon: BarChart3,
  roles: ["admin", "staff", "SHOP_ADMIN"],
  permission: "reports",
};
