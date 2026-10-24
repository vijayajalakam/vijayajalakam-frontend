import { dashboardSidebarConfig } from "../../features/dashboard/config/sidebar.config";
import { invoiceSidebarConfig } from "../../features/invoice/config/sidebar.config";
import { staffSidebarConfig } from "../../features/staff/config/sidebar.config";
import { buyerSidebarConfig } from "../../features/buyer/config/sidebar.config";
import { stockSidebarConfig } from "../../features/stock/config/sidebar.config";
import { accountsSidebarConfig } from "../../features/accounts/config/sidebar.config";
import { reportsSidebarConfig } from "../../features/reports/config/sidebar.config";
import { settingsSidebarConfig } from "../../features/settings/config/sidebar.config";

export const adminMenu = [
  dashboardSidebarConfig,
  invoiceSidebarConfig,
  ...staffSidebarConfig,
  buyerSidebarConfig,
  stockSidebarConfig,
  accountsSidebarConfig,
  reportsSidebarConfig,
  settingsSidebarConfig,
];
