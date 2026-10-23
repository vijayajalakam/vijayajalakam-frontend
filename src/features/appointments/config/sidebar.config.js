import { UserCog } from "lucide-react";

export const appointmentsSidebarConfig = [
  {
    label: "HRM",
    path: "/admin/hrm",
    icon: UserCog,
    roles: ["admin", "SHOP_ADMIN"],
    permission: "hrm",
  },
];
