import { userMenu } from './userMenu.config';
import AdminNavbar from '../admin/AdminNavbar';

const UserNavbar = ({ onMenuClick }) => {
    return (
        <AdminNavbar
            portalLabel="VIJAYAJALAKAM"
            menuItems={userMenu}
            onMenuClick={onMenuClick}
        />
    );
};

export default UserNavbar;
