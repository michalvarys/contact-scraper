import React from 'react';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { Company } from '@contact-scraper/api/routers';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { IndeterminateCheckbox } from '@/components/atoms/IndeterminateCheckbox';
import { TruncatedText } from '@/components/atoms/TruncatedText';

// Pomocník pro vytváření sloupců
const columnHelper = createColumnHelper<Company>();

// Vytvoření sloupců tabulky
export const createColumns = (
    onEdit: (business: Company) => void,
    onDelete: (businessId: string) => void
): ColumnDef<Company, any>[] => [
        {
            id: 'select',
            header: ({ table }) => (
                <IndeterminateCheckbox
                    checked={table.getIsAllRowsSelected()}
                    indeterminate={table.getIsSomeRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row }) => (
                <div className="px-1">
                    <IndeterminateCheckbox
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        indeterminate={row.getIsSomeSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                </div>
            ),
            enableSorting: false,
            size: 40,
            maxSize: 40
        },
        // Optimalizovaný sloupec s indexem
        columnHelper.accessor(
            // Použití funkce pro přístup k původnímu indexu v datech
            (row, index) => index,
            {
                id: 'index',
                header: '#',
                cell: ({ getValue }) => {
                    // Získání hodnoty indexu (počítáno od 1)
                    return getValue<number>() + 1;
                },
                size: 60,
                enableSorting: false, // Zakázání řazení pro index
            }
        ),
        columnHelper.accessor('name', {
            header: 'Název',
            cell: (info) => {
                const business = info.row.original;
                return (
                    <a
                        href={business.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        title={business.name}
                    >
                        <TruncatedText text={business.name} maxLength={30} />
                    </a>
                );
            },
            size: 200,
        }),
        columnHelper.accessor('email', {
            header: 'Email',
            cell: (info) => {
                const email = info.getValue();
                return email ? (
                    <a
                        href={`mailto:${email}`}
                        className="hover:underline"
                    >
                        <TruncatedText text={email} maxLength={25} />
                    </a>
                ) : null;
            },
            size: 200,
        }),
        columnHelper.accessor('website', {
            header: 'Web',
            cell: (info) => {
                const website = info.getValue();
                return website ? (
                    <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                    >
                        <TruncatedText text={website} maxLength={25} />
                    </a>
                ) : null;
            },
            size: 200,
        }),
        columnHelper.accessor('phone', {
            header: 'Telefon',
            cell: (info) => {
                const phone = info.getValue();
                return <TruncatedText text={phone} maxLength={15} />;
            },
            size: 120,
        }),
        columnHelper.accessor((row) => row.categories?.map((c) => c.name).join(', '), {
            id: 'categories',
            header: 'Kategorie',
            cell: (info) => {
                const categories = info.getValue();
                return <TruncatedText text={categories} maxLength={30} />;
            },
            size: 200,
        }),
        columnHelper.accessor('address', {
            header: 'Adresa',
            cell: (info) => {
                const address = info.getValue();
                return <TruncatedText text={address} maxLength={30} />;
            },
            size: 200,
        }),
        columnHelper.accessor((row) => row.metadata?.notes || '', {
            id: 'metadata.notes',
            header: 'Poznámky',
            cell: (info) => {
                const notes = info.getValue();
                return <TruncatedText text={notes} maxLength={30} />;
            },
            size: 200,
        }),
        columnHelper.accessor('scrapedAt', {
            header: 'Vytvořeno',
            cell: (info) => {
                const date = info.getValue();
                return date ? new Date(date).toLocaleString('cs-CZ') : '-';
            },
            size: 150,
        }),
        {
            id: 'actions',
            header: 'Akce',
            cell: ({ row }) => {
                const business = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(business);
                            }}
                            title="Upravit"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(business.id);
                            }}
                            title="Smazat"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
            enableSorting: false,
            size: 100,
        },
    ];
