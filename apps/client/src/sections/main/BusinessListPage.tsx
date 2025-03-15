"use client"
import React from 'react';

import { BusinessTableProvider } from './contexts/BusinessTableContext';
import BusinessTable from './components/CompanyTable';
import { TableBulkActions } from './components/TableBulkActions';
import { TableFilters } from './components/TableFilters';

type BusinessListPageProps = {
    className?: string
}

export function BusinessListPage(props: BusinessListPageProps) {

    return (
        <BusinessTableProvider>
            <div className={props.className}>
                <h1 className="text-3xl font-bold mb-6">Firemní databáze</h1>

                <TableFilters />
                <TableBulkActions />
                <BusinessTable />
            </div>
        </BusinessTableProvider>
    );
};

export default BusinessListPage;
