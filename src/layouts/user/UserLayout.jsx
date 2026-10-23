import { Outlet, useLocation, useParams } from 'react-router-dom';
import UserNavbar from '../../components/user/UserNavbar';
import UserBottomNav from './UserBottomNav';
import CartDrawer from '../../components/user/CartDrawer';
import '../../styles/user-premium.css';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { clearBadgeCount } from '../../store/slices/bookingBadgeSlice';

const UserLayout = () => {
    const location = useLocation();
    const { shopSlug } = useParams();
    const dispatch = useDispatch();
    const isHome = location.pathname === '/' || location.pathname.endsWith('/user/home');
    const isFavourites = location.pathname.endsWith('/user/favourites');
    const isSearch = location.pathname.endsWith('/user/search');
    const isGallery = location.pathname.endsWith('/user/gallery');
    const isBookings = location.pathname.endsWith('/user/bookings') || location.pathname.includes('/user/bookings');
    const isBookingDetails = location.pathname.includes('/user/booking/');
    const isBookingFlow = location.pathname.includes('/user/select-services') ||
        location.pathname.includes('/user/select-professional') ||
        location.pathname.includes('/user/select-datetime') ||
        location.pathname.includes('/user/review-booking') ||
        location.pathname.includes('/user/confirm-pay') ||
        location.pathname.includes('/user/appointment-confirmed');
    const isProfileEdit = location.pathname.includes('/user/profile/edit') || location.pathname.includes('/user/profile/address') || location.pathname.includes('/user/profile/details') || isBookingFlow;

    useEffect(() => {
        if (isBookings || isBookingDetails) {
            dispatch(clearBadgeCount());
        }
    }, [isBookings, isBookingDetails, dispatch]);

    useEffect(() => {
        if (!location.hash) {
            window.scrollTo(0, 0);
        }
    }, [location.pathname, location.hash]);

    useEffect(() => {
        if (shopSlug) {
            localStorage.setItem("lastShopSlug", shopSlug);
        }
    }, [shopSlug]);

    const isProfile = location.pathname.endsWith('/user/profile');
    const hideNavigation = isFavourites || isProfileEdit || isBookingDetails || isGallery;
    const hideTopNav = hideNavigation || isHome || isBookings || isSearch || isProfile || isFavourites || isGallery;

    return (
        <div className="min-h-screen user-premium-body flex flex-col antialiased" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {!hideTopNav && <UserNavbar />}
            <CartDrawer />
            
            <main className={`flex-1 ${hideNavigation || isHome ? '' : 'pb-20 md:pb-10'} ${isHome || isFavourites || isProfileEdit || isBookings || isBookingDetails || isSearch || isProfile || isGallery ? 'w-full' : 'max-w-7xl mx-auto w-full px-4 sm:px-8'}`}>
                <Outlet />
            </main>
            
            {!hideNavigation && <UserBottomNav />}
        </div>
    );
};

export default UserLayout;
