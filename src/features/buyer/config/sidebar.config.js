import { Users } from "lucide-react";

export const buyerSidebarConfig = {
  label: "Buyer",
  path: "/admin/crm",
  icon: Users,
  roles: ["admin", "staff", "SHOP_ADMIN"],
  permission: "crm",
};

export const crmSidebarConfig = buyerSidebarConfig;
