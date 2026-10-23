import DesktopSidebar from '../../admin/adminSidebar/DesktopSidebar'
import MobileSidebar from '../../admin/adminSidebar/MobileSidebar'
import { userMenu } from '../userMenu.config'

const UserSidebar = ({ isOpen, setOpen, isMobile, onClose }) => {
    if (isMobile) {
        return <MobileSidebar isOpen={isOpen} onClose={onClose} menuItems={userMenu} title="VIJAYAJALAKAM" />
    }
    return <DesktopSidebar isOpen={isOpen} setOpen={setOpen} menuItems={userMenu} />
}

export default UserSidebar
