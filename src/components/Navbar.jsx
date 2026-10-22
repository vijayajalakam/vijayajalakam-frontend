import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { shopSlug } = useParams();

    const basePath = shopSlug ? `/${shopSlug}` : '';

    // Do not show navbar on login, register, admin, or staff pages
    // Adjusted to check paths after the shopSlug
    const relativePath = shopSlug ? location.pathname.substring(shopSlug.length + 1) : location.pathname;

    if (['/login', '/register'].includes(relativePath) ||
        relativePath.startsWith('/admin') ||
        relativePath.startsWith('/staff')) {
        return null;
    }

    const handleLogout = async () => {
        await logout();
        // Clear browser history and force reload to login page
        window.history.replaceState(null, '', `${basePath}/login`);
        window.location.href = `${basePath}/login`;
    };

    return (
        <nav className="bg-brand-primary text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <Link to={`${basePath}/`} className="text-xl font-bold">Salon System</Link>
                <div className="space-x-4">
                    {user ? (
                        <>
                            {user.role === 'admin' && (
                                <>
                                    <Link to={`${basePath}/admin/dashboard`} className="hover:text-gray-300">Dashboard</Link>
                                    <Link to={`${basePath}/admin/hrm`} className="hover:text-gray-300">HRM</Link>
                                    <Link to={`${basePath}/admin/services`} className="hover:text-gray-300">Services</Link>
                                </>
                            )}
                            {user.role === 'staff' && (
                                <>
                                    <Link to={`${basePath}/staff/bookings`} className="hover:text-gray-300">Bookings</Link>
                                    <Link to={`${basePath}/staff/invoice`} className="hover:text-gray-300">Invoice</Link>
                                </>
                            )}
                            {user.role === 'user' && (
                                <>
                                    <Link to={`${basePath}/book`} className="hover:text-gray-300">Book Appointment</Link>
                                    <Link to={`${basePath}/my-bookings`} className="hover:text-gray-300">My Bookings</Link>
                                </>
                            )}
                            <span className="text-yellow-400 font-semibold">Hi, {user.name}</span>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to={`${basePath}/login`} className="hover:text-gray-300">Login</Link>
                            <Link to={`${basePath}/register`} className="hover:text-gray-300">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
