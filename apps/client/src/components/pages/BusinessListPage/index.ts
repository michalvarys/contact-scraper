'use client';
import lazyLoad from '@/utils/lazyLoad';

export * from './BusinessListPage';

export default lazyLoad(() => import('./BusinessListPage'));
