import { Home, Search, Calendar, User } from 'lucide-react';

export const userMenu = [
    {
        path: '/user/home',
        label: 'Home',
        icon: Home,
        activePaths: ['/user/home']
    },
    {
        path: '/user/search',
        label: 'Search',
        icon: Search,
        activePaths: ['/user/search']
    },
    {
        path: '/user/bookings',
        label: 'Bookings',
        icon: Calendar,
        activePaths: ['/user/bookings', '/user/my-bookings']
    },
    {
        path: '/user/profile',
        label: 'Profile',
        icon: User,
        activePaths: ['/user/profile']
    }
];
