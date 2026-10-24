import { FileText } from "lucide-react";

export const invoiceSidebarConfig = {
  label: "Invoice",
  path: "/invoice",
  icon: FileText,
  roles: ["staff", "admin", "SHOP_ADMIN"],
  permission: "invoice",
};

export const salesSidebarConfig = invoiceSidebarConfig;
