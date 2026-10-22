import DesktopSidebar from "./DesktopSidebar";
import MobileSidebar from "./MobileSidebar";

import { adminMenu } from "../adminMenu.config";

const AdminSidebar = ({ isOpen, setOpen, isMobile, onClose }) => {
  if (isMobile) {
    return (
      <MobileSidebar isOpen={isOpen} onClose={onClose} menuItems={adminMenu} />
    );
  }
  return (
    <DesktopSidebar isOpen={isOpen} setOpen={setOpen} menuItems={adminMenu} />
  );
};

export default AdminSidebar;
