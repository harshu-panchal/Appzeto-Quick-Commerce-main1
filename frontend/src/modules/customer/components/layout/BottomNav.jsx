import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Category', icon: LayoutGrid, path: '/categories', matchPrefix: '/category' },
    { label: 'Orders', icon: ShoppingBag, path: '/orders' },
    { label: 'Profile', icon: User, path: '/profile', subPaths: ['/profile', '/profile/edit', '/addresses', '/wallet', '/settings'] },
];

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
            className="fixed bottom-0 left-0 right-0 z-[500] bg-white/95 backdrop-blur-md border-t border-slate-200/75 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        >
            <div className="w-full max-w-md mx-auto h-[56px] grid grid-cols-4 items-center px-2">
                {navItems.map((item) => {
                    const isActive = isItemActive(item);

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="relative flex flex-col items-center justify-center h-full group select-none"
                        >
                            {/* Top Accent Indicator */}
                            {isActive && (
                                <motion.div
                                    layoutId="customer-bottom-nav-indicator"
                                    className="absolute top-0 w-8 h-[2.5px] bg-primary rounded-full z-20"
                                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                />
                            )}

                            {/* Active Soft Pill Background - Centered within Tab Column */}
                            {isActive && (
                                <motion.div
                                    layoutId="customer-bottom-nav-pill"
                                    className="absolute inset-y-1 inset-x-1 sm:inset-x-2 bg-primary/8 rounded-xl -z-10 border border-primary/10"
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}

                            {/* Icon & Label */}
                            <div className="flex flex-col items-center justify-center relative z-10">
                                <div
                                    className={cn(
                                        "transition-all duration-200",
                                        isActive ? "scale-105 text-primary" : "scale-100 text-slate-400 group-hover:text-slate-600"
                                    )}
                                >
                                    <item.icon
                                        size={21}
                                        strokeWidth={isActive ? 2.4 : 2}
                                        className="transition-colors duration-200"
                                    />
                                </div>

                                <span
                                    className={cn(
                                        "text-[10px] tracking-tight mt-0.5 transition-all duration-200 leading-none",
                                        isActive ? "font-bold text-primary" : "font-medium text-slate-500 group-hover:text-slate-700"
                                    )}
                                >
                                    {item.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;

