"use client"
import React, { useState, useMemo } from 'react';
import { BusinessTable } from '@/components/organisms/BusinessTable';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { EditBusinessForm } from '@/components/organisms/EditBusinessForm';
import { BulkCategoryChange } from '@/components/organisms/BulkCategoryChange';
import { Button } from '@/components/atoms/Button';
import { Tag, Trash2 } from 'lucide-react';
import { useFilters } from '@/hooks/useFilters';
import { Company, UpdateCompanyData } from '@contact-scraper/api/routers';
import { useBusinessMutations } from '@/hooks/api';
import { useBusinessTable, BusinessTableProvider } from '@/contexts/BusinessTableContext';
import { createColumns } from '@/components/organisms/BusinessTable/columns';
import CustomSelect from '@/components/molecules/CustomSelect';

export interface DuplicateBusinessListPageProps {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Vnitřní komponenta stránky, která používá kontext tabulky
 */
const DuplicateBusinessListPageContent: React.FC<DuplicateBusinessListPageProps> = ({ className }) => {
    const { filters, setFilter } = useFilters();

    // Stavy pro modální okna a akce
    const [editingBusiness, setEditingBusiness] = useState<Company | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [businessToDelete, setBusinessToDelete] = useState<string | null>(null);
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
    const [bulkCategoryChangeOpen, setBulkCategoryChangeOpen] = useState(false);

    // Mutace pro operace s firmami
    const { updateBusiness, deleteBusiness, bulkUpdateCategory, bulkDelete } = useBusinessMutations();

    // Získání tabulky pro práci s výběrem
    const { table, data: companies, rowSelection } = useBusinessTable();

    // Získání vybraných řádků přímo z tabulky
    const selectedRows = useMemo(() => {
        return table.getSelectedRowModel().flatRows.map(row => row.original);
    }, [table, rowSelection]);

    // Funkce pro úpravu firmy
    const handleEditBusiness = (company: Company) => {
        setEditingBusiness(company);
    };

    // Funkce pro uložení úprav
    const handleSaveBusiness = (updatedBusiness: UpdateCompanyData) => {
        updateBusiness.mutate(updatedBusiness, {
            onSuccess: () => {
                setEditingBusiness(null);
            }
        });
    };

    // Funkce pro smazání firmy
    const handleDeleteClick = (businessId: string) => {
        setBusinessToDelete(businessId);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (businessToDelete) {
            deleteBusiness.mutate(businessToDelete, {
                onSuccess: () => {
                    setDeleteConfirmOpen(false);
                    setBusinessToDelete(null);
                }
            });
        }
    };

    // Funkce pro hromadné akce
    const handleBulkDeleteClick = () => {
        if (selectedRows.length > 0) {
            setBulkDeleteConfirmOpen(true);
        }
    };

    const handleConfirmBulkDelete = () => {
        const selectedIds = selectedRows.map(business => business.id);
        if (selectedIds.length > 0) {
            bulkDelete.mutate({ businessIds: selectedIds }, {
                onSuccess: () => {
                    setBulkDeleteConfirmOpen(false);
                    table.resetRowSelection(); // Reset výběru v tabulce
                }
            });
        }
    };

    const handleBulkCategoryChangeClick = () => {
        if (selectedRows.length > 0) {
            setBulkCategoryChangeOpen(true);
        }
    };

    const handleApplyBulkCategoryChange = (categoryId: number) => {
        const selectedIds = selectedRows.map(business => business.id);
        if (selectedIds.length > 0) {
            bulkUpdateCategory.mutate(
                { businessIds: selectedIds, categoryId },
                {
                    onSuccess: () => {
                        setBulkCategoryChangeOpen(false);
                        table.resetRowSelection(); // Reset výběru v tabulce
                    }
                }
            );
        }
    };

    // Získání aktuálně vybraných duplicitních vlastností
    const selectedDuplicateFields = filters.duplicates?.split(',').filter(Boolean) || [];

    return (
        <div className={className}>
            <h1 className="text-3xl font-bold mb-6">Duplicitní záznamy</h1>

            {/* Filtry pro duplicitní záznamy */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h2 className="text-lg font-semibold mb-2">Vyberte vlastnosti pro zobrazení duplicit</h2>
                <div className="flex items-center gap-2 mb-2">
                    <CustomSelect
                        className='min-w-[200px]'
                        multiple
                        value={selectedDuplicateFields}
                        options={[
                            { id: 'email', label: 'Email', value: "email" },
                            { id: 'phone', label: 'Telefon', value: "phone" },
                            { id: 'website', label: 'Web', value: "website" },
                            { id: 'name', label: 'Název', value: "name" },
                        ]}
                        onChange={(checked) => {
                            setFilter('duplicates', checked);
                        }}
                    />
                    <span className="text-sm text-gray-500">
                        {selectedDuplicateFields.length === 0
                            ? 'Vyberte alespoň jednu vlastnost pro zobrazení duplicitních záznamů'
                            : `Zobrazují se záznamy s duplicitními hodnotami: ${selectedDuplicateFields.join(', ')}`}
                    </span>
                </div>
            </div>

            {/* Hromadné akce */}
            {selectedRows.length > 0 && (
                <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div>
                            Vybráno: <strong>{selectedRows.length}</strong> záznamů
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                table.resetRowSelection();
                            }}
                            className="flex items-center gap-1"
                        >
                            Zrušit výběr
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkCategoryChangeClick}
                            className="flex items-center gap-1"
                        >
                            <Tag className="h-4 w-4" />
                            Změnit kategorii
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDeleteClick}
                            className="flex items-center gap-1"
                        >
                            <Trash2 className="h-4 w-4" />
                            Smazat vybrané
                        </Button>
                    </div>
                </div>
            )}

            {/* Informace, pokud nejsou vybrány žádné duplicitní vlastnosti */}
            {selectedDuplicateFields.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4 text-yellow-800">
                    Pro zobrazení duplicitních záznamů vyberte alespoň jednu vlastnost v sekci filtrů výše.
                </div>
            )}

            {/* Tabulka firem */}
            <BusinessTable
                onEdit={handleEditBusiness}
                onDelete={handleDeleteClick}
            />

            {/* Modální okna */}
            {/* Editace firmy */}
            {editingBusiness && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
                        <h2 className="text-xl font-bold mb-4">Upravit firmu</h2>
                        <EditBusinessForm
                            company={editingBusiness}
                            onSave={handleSaveBusiness}
                            onCancel={() => setEditingBusiness(null)}
                        />
                    </div>
                </div>
            )}

            {/* Potvrzení smazání */}
            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                title="Smazat firmu"
                message="Opravdu chcete smazat tuto firmu? Tato akce je nevratná."
                confirmLabel="Smazat"
                cancelLabel="Zrušit"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirmOpen(false)}
            />

            {/* Potvrzení hromadného smazání */}
            <ConfirmDialog
                isOpen={bulkDeleteConfirmOpen}
                title="Smazat vybrané firmy"
                message={`Opravdu chcete smazat ${selectedRows.length} vybraných firem? Tato akce je nevratná.`}
                confirmLabel="Smazat"
                cancelLabel="Zrušit"
                onConfirm={handleConfirmBulkDelete}
                onCancel={() => setBulkDeleteConfirmOpen(false)}
            />

            {/* Hromadná změna kategorie */}
            {bulkCategoryChangeOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Změnit kategorii</h2>
                        <BulkCategoryChange
                            onApply={handleApplyBulkCategoryChange}
                            onCancel={() => setBulkCategoryChangeOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Stránka se seznamem duplicitních firem
 */
export const DuplicateBusinessListPage: React.FC<DuplicateBusinessListPageProps> = (props) => {
    // Memoizace definice sloupců, aby se nevytvářela při každém renderování
    const columns = useMemo(() => {
        const handleEdit = (company: Company) => {
            // Tato funkce bude předána do DuplicateBusinessListPageContent přes props
            // a tam bude použita pro otevření modálního okna pro editaci
        };

        const handleDelete = (businessId: string) => {
            // Tato funkce bude předána do DuplicateBusinessListPageContent přes props
            // a tam bude použita pro otevření potvrzovacího dialogu pro smazání
        };

        return createColumns(handleEdit, handleDelete);
    }, []);

    return (
        <BusinessTableProvider columns={columns}>
            <DuplicateBusinessListPageContent {...props} />
        </BusinessTableProvider>
    );
};

export default DuplicateBusinessListPage;
