import { Landmark } from "lucide-react";

export const accountsSidebarConfig = {
  label: "Accounts",
  path: "/admin/accounts",
  icon: Landmark,
  roles: ["admin", "SHOP_ADMIN"],
  permission: "accounts",
};

export const accountingSidebarConfig = accountsSidebarConfig;
