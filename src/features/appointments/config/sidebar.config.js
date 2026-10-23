import { UserCog } from "lucide-react";

export const appointmentsSidebarConfig = [
  {
    label: "Staff",
    path: "/admin/hrm",
    icon: UserCog,
    roles: ["admin", "SHOP_ADMIN", "staff"],
    permission: "hrm",
  },
];
