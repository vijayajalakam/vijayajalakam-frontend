import { Users } from "lucide-react";

export const crmSidebarConfig = {
  label: "Buyer",
  path: "/admin/crm",
  icon: Users,
  roles: ["admin", "staff", "SHOP_ADMIN"],
  permission: "crm",
};
