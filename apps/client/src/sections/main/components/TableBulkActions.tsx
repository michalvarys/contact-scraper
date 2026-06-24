"use client"
import { useBusinessTable } from "../contexts/BusinessTableContext";
import Button from "@/components/atoms/Button";
import { useState, useCallback } from "react";
import ConfirmButton from "@/components/atoms/ConfirmButton";
import { CheckSquare, Square, Tag, Trash2 } from "lucide-react";
import { useBusinessMutations } from "@/hooks";
import { useFilters } from "@/hooks/useFilters";
import { trpc } from "@/trpc/trpc";
import BulkCategoryChange from "./BulkCategoryChange";

export function TableBulkActions() {
    const { selectedRows, table, pagination, isAllSelected, setIsAllSelected } = useBusinessTable();
    const [bulkCategoryChangeOpen, setBulkCategoryChangeOpen] = useState(false);
    const { bulkUpdateCategory } = useBusinessMutations();
    const { bulkDelete } = useBusinessMutations();
    const { filters } = useFilters();
    const { data: allIds, isFetching: isAllIdsFetching } = trpc.company.getAllIds.useQuery(filters, {
        enabled: isAllSelected,
        keepPreviousData: false,
    });

    const getEffectiveIds = useCallback((): string[] => {
        if (isAllSelected && allIds && !isAllIdsFetching) {
            return allIds;
        }
        return selectedRows.map(business => business.id);
    }, [isAllSelected, allIds, isAllIdsFetching, selectedRows]);

    if (selectedRows.length === 0) {
        return null
    }

    const allIdsReady = isAllSelected && allIds && !isAllIdsFetching;
    const effectiveCount = isAllSelected ? (allIdsReady ? allIds.length : pagination.totalItems) : selectedRows.length;
    const allPageSelected = table.getIsAllPageRowsSelected();

    const handleApplyBulkCategoryChange = (categoryId: number) => {
        const selectedIds = getEffectiveIds();
        if (selectedIds.length > 0) {
            bulkUpdateCategory.mutate(
                { businessIds: selectedIds, categoryId },
                {
                    onSuccess: () => {
                        setBulkCategoryChangeOpen(false);
                        table.resetRowSelection();
                        setIsAllSelected(false);
                    }
                }
            );
        }
    };

    const handleBulkCategoryChangeClick = () => {
        if (selectedRows.length > 0) {
            setBulkCategoryChangeOpen(true);
        }
    };

    const handleBulkDelete = () => {
        const selectedIds = getEffectiveIds();
        if (selectedIds.length > 0) {
            bulkDelete.mutate({ businessIds: selectedIds }, {
                onSuccess: () => {
                    table.resetRowSelection();
                    setIsAllSelected(false);
                }
            });
        }
    };

    const handleToggleAllRecords = () => {
        if (isAllSelected) {
            setIsAllSelected(false);
        } else {
            table.toggleAllPageRowsSelected(true);
            setIsAllSelected(true);
        }
    };

    return (
        <>
            <div className="bg-gray-100 p-3 rounded-lg flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div>
                        Vybráno: <strong>{effectiveCount}</strong> záznamů
                        {isAllSelected && (isAllIdsFetching ? " (načítám...)" : " (všechny)")}
                    </div>

                    {allPageSelected && pagination.totalItems > selectedRows.length && (
                        <Button
                            variant={isAllSelected ? "default" : "outline"}
                            size="sm"
                            onClick={handleToggleAllRecords}
                            className="flex items-center gap-1"
                        >
                            {isAllSelected ? (
                                <>
                                    <Square className="h-4 w-4" />
                                    Jen tato stránka ({selectedRows.length})
                                </>
                            ) : (
                                <>
                                    <CheckSquare className="h-4 w-4" />
                                    Vybrat všech {pagination.totalItems}
                                </>
                            )}
                        </Button>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            table.resetRowSelection();
                            setIsAllSelected(false);
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
                    <ConfirmButton
                        variant="destructive"
                        size="sm"
                        onConfirm={handleBulkDelete}
                        confirmTitle="Smazat vybrané firmy"
                        confirmDescription={`Opravdu chcete smazat ${effectiveCount} vybraných firem? Tato akce je nevratná.`}
                        confirmButtonText="Smazat"
                        confirmButtonVariant="destructive"
                        className="flex items-center gap-1"
                    >
                        <Trash2 className="h-4 w-4" />
                        Smazat vybrané
                    </ConfirmButton>
                </div>
            </div>

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
        </>
    )
}
