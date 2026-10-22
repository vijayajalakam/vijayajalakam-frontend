import { Settings } from "lucide-react";

export const settingsSidebarConfig = {
  label: "Settings",
  path: "/admin/settings",
  icon: Settings,
  roles: ["admin", "SHOP_ADMIN"],
  permission: "settings",
};
