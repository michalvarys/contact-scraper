"use client";
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

/**
 * Loader komponenta, která se zobrazí během načítání
 */
const DefaultLoader = () => (
    <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
);

/**
 * Funkce pro lazy loading komponent
 * 
 * @param importFunc - Funkce pro dynamický import komponenty
 * @param LoadingComponent - Komponenta, která se zobrazí během načítání
 * @returns Lazy loaded komponenta
 * 
 * @example
 * ```tsx
 * const LazyBusinessListPage = lazyLoad(() => import('@/components/pages/BusinessListPage'));
 * 
 * // V komponentě
 * return <LazyBusinessListPage />;
 * ```
 */
export function lazyLoad<T extends React.ComponentType<any>>(
    importFunc: () => Promise<{ default: T }>,
    LoadingComponent: React.ComponentType = DefaultLoader
) {
    const LazyComponent = dynamic(importFunc, {
        loading: () => <LoadingComponent />,
        ssr: false,
    });

    return (props: React.ComponentProps<T>) => (
        <Suspense fallback={<LoadingComponent />}>
            <LazyComponent {...props} />
        </Suspense>
    );
}

export default lazyLoad;
