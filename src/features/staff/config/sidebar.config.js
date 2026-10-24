import { UserCog } from "lucide-react";

export const staffSidebarConfig = [
  {
    label: "Staff",
    path: "/admin/hrm",
    icon: UserCog,
    roles: ["admin", "SHOP_ADMIN", "staff"],
    permission: "hrm",
  },
];

export const appointmentsSidebarConfig = staffSidebarConfig;
