import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userMenu } from './userMenu.config';
import { selectBookingBadgeCount } from '../../store/slices/bookingBadgeSlice';

const UserBottomNav = () => {
    const location = useLocation();
    const badgeCount = useSelector(selectBookingBadgeCount);
    const { shopSlug } = useParams();
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    
    // Hide bottom nav when search input is focused
    useEffect(() => {
        const handleSearchFocus = () => {
            if (location.pathname.includes('/search')) {
                setIsSearchFocused(true);
            }
        };
        
        const handleSearchBlur = () => {
            setIsSearchFocused(false);
        };
        
        // Listen for custom events from search input
        document.addEventListener('searchFocus', handleSearchFocus);
        document.addEventListener('searchBlur', handleSearchBlur);
        
        return () => {
            document.removeEventListener('searchFocus', handleSearchFocus);
            document.removeEventListener('searchBlur', handleSearchBlur);
        };
    }, [location.pathname]);

    // Global keyboard detection - hide bottom nav when any input is focused
    useEffect(() => {
        const handleFocusIn = (e) => {
            // Check if the focused element is an input, textarea, or contenteditable
            const target = e.target;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                setIsKeyboardVisible(true);
            }
        };

        const handleFocusOut = (e) => {
            // Small delay to prevent flicker when switching between inputs
            setTimeout(() => {
                const activeElement = document.activeElement;
                if (
                    !activeElement ||
                    (activeElement.tagName !== 'INPUT' &&
                     activeElement.tagName !== 'TEXTAREA' &&
                     !activeElement.isContentEditable)
                ) {
                    setIsKeyboardVisible(false);
                }
            }, 100);
        };

        // Also listen for visual viewport resize (more reliable for mobile keyboards)
        const handleResize = () => {
            if (window.visualViewport) {
                const viewportHeight = window.visualViewport.height;
                const windowHeight = window.innerHeight;
                // If viewport height is significantly less than window height, keyboard is likely open
                setIsKeyboardVisible(windowHeight - viewportHeight > 150);
            }
        };

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);
        
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        }

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    // Check if we're on checkout or product detail pages
    const isCheckoutOrProduct = location.pathname.includes('/user/checkout') || 
                                 location.pathname.includes('/user/product/');

    // Check if we're on booking-related pages that should show bottom nav
    const isBookingRelated = location.pathname.includes('/user/booking/') || 
                              location.pathname.includes('/user/bookings');

    // Hide bottom navigation if we are inside a shop (shopSlug exists)
    // EXCEPT on booking detail and bookings list pages
    if (shopSlug && !isBookingRelated) {
        return null;
    }

    // For search tab, navigate to search screen
    const getNavPath = (item) => {
        // When inside a shop context on booking pages, use global paths
        if (shopSlug) {
            if (item.path === '/user/home') return '/';
            if (item.path === '/user/bookings') return '/user/bookings';
            if (item.path === '/user/profile') return '/user/profile';
            if (item.path === '/user/search') return '/user/search';
            return item.path;
        }
        if (item.path === '/user/search') return '/user/search';
        const basePath = item.path;
        return basePath === '/user/home' ? '/' : basePath;
    };

    // Hide bottom nav when search is focused or when keyboard might be open
    if ((isSearchFocused && location.pathname.includes('/search')) || isKeyboardVisible) {
        return null;
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-dark-border shadow-[0_-2px_10px_rgba(0,0,0,0.06)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex justify-around items-center h-14 px-2">
                {userMenu.map((item) => {
                    const Icon = item.icon;
                    const toPath = getNavPath(item);
                    const isCustomActive = item.activePaths?.some(path => 
                        location.pathname === (shopSlug ? `/${shopSlug}${path}` : path)
                    );
                    
                    // Keep Home active when on checkout or product pages
                    const isHomeAndCheckout = item.label === 'Home' && isCheckoutOrProduct;

                    return (
                        <NavLink
                            key={item.path}
                            to={toPath}
                            className={({ isActive }) => {
                                const active = isActive || isCustomActive || isHomeAndCheckout;
                                return `relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 ${
                                    active
                                        ? 'text-black dark:text-white'
                                        : 'text-gray-400 dark:text-gray-500'
                                }`;
                            }}
                        >
                            {({ isActive }) => {
                                const active = isActive || isCustomActive || isHomeAndCheckout;
                                return (
                                    <>
                                        <div className="relative">
                                            <Icon 
                                                size={22}
                                                strokeWidth={active ? 2.5 : 1.8}
                                                className="transition-all duration-200"
                                                fill="none"
                                            />
                                            {item.label === "Bookings" && badgeCount > 0 && (
                                                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center shadow-md border border-white dark:border-dark-surface">
                                                    {badgeCount}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Label */}
                                        <span className={`text-[10px] transition-colors duration-200 ${active ? 'font-semibold' : 'font-medium'}`}>
                                            {item.label}
                                        </span>
                                    </>
                                );
                            }}
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
};

export default UserBottomNav;
