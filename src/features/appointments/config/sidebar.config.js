import { CalendarDays, UserCog } from "lucide-react";

export const appointmentsSidebarConfig = [
  {
    label: "Bookings",
    path: "/bookings",  // getDynamicPortalPath will add role prefix
    icon: CalendarDays,
    roles: ["staff", "admin", "SHOP_ADMIN"],
    permission: "bookings",
  },
  {
    label: "HRM",
    path: "/admin/hrm",  // Changed to HRM layout
    icon: UserCog,
    roles: ["admin", "SHOP_ADMIN"],
    permission: "hrm",
  },
];
