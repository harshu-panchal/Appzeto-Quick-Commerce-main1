import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Browse', icon: LayoutGrid, path: '/categories', matchPrefix: '/category' },
    { label: 'Cart', icon: ShoppingCart, path: '/cart', matchPrefix: '/checkout' },
    { label: 'Profile', icon: User, path: '/profile', subPaths: ['/profile', '/profile/edit', '/addresses', '/wallet', '/settings'] },
];

// MD3 navigation bar: tonal surface-container, 56x32 pill active indicator
// (secondary-container), label-medium text. Tokens come from customer-mobile.css.
const BottomNav = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const isItemActive = (item) => {
        if (item.path === '/') {
            return currentPath === '/';
        }
        if (item.matchPrefix && currentPath.startsWith(item.matchPrefix)) {
            return true;
        }
        if (item.subPaths && item.subPaths.some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
            return true;
        }
        return currentPath === item.path || currentPath.startsWith(item.path + '/');
    };

    return (
        <nav
            role="navigation"
            aria-label="Mobile Navigation"
            className="customer-bottom-nav fixed bottom-0 left-0 right-0 z-[500] md:hidden bg-[var(--md-sys-color-surface-container,#f0f2ec)]"
        >
            <div className="w-full max-w-md mx-auto h-16 grid grid-cols-4 items-center">
                {navItems.map((item) => {
                    const isActive = isItemActive(item);

                    return (
                        <Link
                            replace
                            key={item.path}
                            to={item.path}
                            aria-current={isActive ? 'page' : undefined}
                            className="group flex h-full flex-col items-center justify-center gap-1 select-none"
                        >
                            <span className="relative grid h-8 w-14 place-items-center">
                                {isActive && (
                                    <motion.span
                                        layoutId="customer-bottom-nav-indicator"
                                        className="customer-bottom-nav__glass absolute inset-0 rounded-full"
                                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                    />
                                )}
                                {/* Hover/pressed state layer */}
                                <span className="absolute inset-0 rounded-full bg-[var(--md-sys-color-on-surface,#1a1c19)] opacity-0 transition-opacity duration-200 group-hover:opacity-[0.08] group-active:opacity-[0.12]" />
                                <item.icon
                                    size={22}
                                    strokeWidth={isActive ? 2.4 : 2}
                                    className={cn(
                                        'relative z-10 transition-colors duration-200',
                                        isActive
                                            ? 'text-[var(--md-sys-color-on-secondary-container,#1d2b1a)]'
                                            : 'text-[var(--md-sys-color-on-surface-variant,#43483f)]'
                                    )}
                                />
                            </span>
                            <span
                                className={cn(
                                    'text-[12px] leading-4 tracking-[0.5px] transition-colors duration-200',
                                    isActive
                                        ? 'font-bold text-[var(--md-sys-color-on-surface,#1a1c19)]'
                                        : 'font-medium text-[var(--md-sys-color-on-surface-variant,#43483f)]'
                                )}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
