import { Landmark } from "lucide-react";

export const accountingSidebarConfig = {
  label: "Accounts",
  path: "/admin/accounts",
  icon: Landmark,
  roles: ["admin", "SHOP_ADMIN"],
  permission: "accounts",
};
