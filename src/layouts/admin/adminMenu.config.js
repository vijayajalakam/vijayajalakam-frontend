import { dashboardSidebarConfig } from "../../features/dashboard/config/sidebar.config";
import { salesSidebarConfig } from "../../features/sales/config/sidebar.config";
import { appointmentsSidebarConfig } from "../../features/appointments/config/sidebar.config";
import { serviceSidebarConfig } from "../../features/appointments/config/serviceSidebar.config";
import { crmSidebarConfig } from "../../features/crm/config/sidebar.config";
import { purchasesSidebarConfig } from "../../features/purchases/config/sidebar.config";
import { inventorySidebarConfig } from "../../features/inventory/config/sidebar.config";
import { accountingSidebarConfig } from "../../features/accounting/config/sidebar.config";
import { reportsSidebarConfig } from "../../features/reports/config/sidebar.config";
import { settingsSidebarConfig } from "../../features/settings/config/sidebar.config";

export const adminMenu = [
  dashboardSidebarConfig,
  salesSidebarConfig,
  ...appointmentsSidebarConfig,
  crmSidebarConfig,
  purchasesSidebarConfig,
  serviceSidebarConfig,
  inventorySidebarConfig,
  accountingSidebarConfig,
  reportsSidebarConfig,
  settingsSidebarConfig,
];
