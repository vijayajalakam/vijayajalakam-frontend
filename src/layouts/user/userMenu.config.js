import { Home, ShoppingBag, User } from 'lucide-react';

export const userMenu = [
    {
        path: '/user/home',
        label: 'Store',
        icon: Home,
        activePaths: ['/user/home', '/']
    },
    {
        path: '/user/cart',
        label: 'Cart',
        icon: ShoppingBag,
        activePaths: ['/user/cart', '/user/cart-checkout']
    },
    {
        path: '/user/profile',
        label: 'Profile',
        icon: User,
        activePaths: ['/user/profile']
    }
];
