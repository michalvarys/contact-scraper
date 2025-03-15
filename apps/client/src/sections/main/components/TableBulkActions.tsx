"use client"
import { useFilters } from "@/hooks/useFilters";
import { useBusinessTable } from "../contexts/BusinessTableContext";
import Button from "@/components/atoms/Button";
import { useState } from "react";
import ConfirmButton from "@/components/atoms/ConfirmButton";
import { Tag, Trash2 } from "lucide-react";
import { useBusinessMutations } from "@/hooks";
import BulkCategoryChange from "./BulkCategoryChange";

export function TableBulkActions() {
    const { selectedRows, table } = useBusinessTable();
    const [bulkCategoryChangeOpen, setBulkCategoryChangeOpen] = useState(false);
    const { bulkUpdateCategory } = useBusinessMutations();
    const { bulkDelete } = useBusinessMutations();

    if (selectedRows.length === 0) {
        return null
    }

    const handleApplyBulkCategoryChange = (categoryId: number) => {
        const selectedIds = selectedRows.map(business => business.id);
        if (selectedIds.length > 0) {
            bulkUpdateCategory.mutate(
                { businessIds: selectedIds, categoryId },
                {
                    onSuccess: () => {
                        setBulkCategoryChangeOpen(false);
                        table.resetRowSelection();

                        // remove records from table
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
        const selectedIds = selectedRows.map(business => business.id);
        if (selectedIds.length > 0) {
            bulkDelete.mutate({ businessIds: selectedIds }, {
                onSuccess: () => {
                    table.resetRowSelection();

                    // remove records from table
                }
            });
        }
    };
    return (
        <>
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
                    <ConfirmButton
                        variant="destructive"
                        size="sm"
                        onConfirm={handleBulkDelete}
                        confirmTitle="Smazat vybrané firmy"
                        confirmDescription={`Opravdu chcete smazat ${selectedRows.length} vybraných firem? Tato akce je nevratná.`}
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