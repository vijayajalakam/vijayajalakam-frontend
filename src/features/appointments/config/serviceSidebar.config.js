import { ConciergeBell } from "lucide-react";

export const serviceSidebarConfig = {
  label: "Services",
  path: "/admin/services",
  icon: ConciergeBell,
  roles: ["admin", "SHOP_ADMIN"],
  permission: "services",
};
