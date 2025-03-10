'use client';
import lazyLoad from '@/utils/lazyLoad';

export * from './DuplicateBusinessListPage';

export default lazyLoad(() => import('./DuplicateBusinessListPage'));