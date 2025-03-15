"use client"
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface NavigationProps {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Komponenta pro hlavní navigaci aplikace
 */
export const Navigation: React.FC<NavigationProps> = ({ className }) => {
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Firemní databáze' },
        { href: '/scraper', label: 'Fronta scraperu' },
    ];

    return (
        <nav className={cn('bg-white shadow-sm', className)}>
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <span className="text-xl font-bold">Firemní databáze</span>
                        </div>
                    </div>
                    <div className="flex">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'px-3 py-2 rounded-md text-sm font-medium',
                                    pathname === item.href
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
