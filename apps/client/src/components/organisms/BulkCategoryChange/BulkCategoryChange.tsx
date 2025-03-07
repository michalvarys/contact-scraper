import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/atoms/Button';
import { useCategories } from '@/hooks/useCategories';
import { CustomSelect } from '@/components/molecules/CustomSelect';

export interface BulkCategoryChangeProps {
    /**
     * Callback při aplikaci změny
     */
    onApply: (categoryId: number) => void;
    /**
     * Callback při zrušení
     */
    onCancel: () => void;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

interface FormData {
    /**
     * ID vybrané kategorie
     */
    categoryId: number;
}

/**
 * Organismická komponenta pro hromadnou změnu kategorie
 * 
 * @example
 * ```tsx
 * <BulkCategoryChange
 *   onApply={(categoryId) => handleBulkCategoryChange(categoryId)}
 *   onCancel={() => setModalOpen(false)}
 * />
 * ```
 */
export const BulkCategoryChange: React.FC<BulkCategoryChangeProps> = ({
    onApply,
    onCancel,
    className
}) => {
    const { data: categories = [], isLoading } = useCategories();

    const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            categoryId: 0
        }
    });

    const onSubmit = (data: FormData) => {
        if (data.categoryId) {
            onApply(data.categoryId);
        }
    };

    // Převedení dat do formátu požadovaného CustomSelect komponentou
    const categoryOptions = categories.map(category => ({
        id: category.id,
        value: category.id.toString(),
        label: category.name,
        data: category
    }));

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className={`p-4 border rounded-lg bg-gray-50 space-y-4 ${className || ''}`}
        >
            <h3 className="font-medium">Změnit kategorii pro vybrané záznamy</h3>

            <div>
                <Controller
                    name="categoryId"
                    control={control}
                    rules={{ required: 'Kategorie je povinná' }}
                    render={({ field: { value, onChange } }) => (
                        <CustomSelect
                            options={categoryOptions}
                            value={value?.toString() || ''}
                            onChange={(val: string | string[]) => {
                                const value = Array.isArray(val) ? val[0] : val;
                                onChange(value ? Number(value) : undefined);
                            }}
                            isLoading={isLoading}
                            placeholder="Vyberte kategorii"
                            searchPlaceholder="Vyhledat kategorii..."
                            noOptionsMessage="Žádné kategorie nenalezeny"
                            loadingMessage="Načítání kategorií..."
                            allowEmpty={false}
                        />
                    )}
                />
                {errors.categoryId && (
                    <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>
                )}
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Zrušit
                </Button>
                <Button type="submit">
                    Použít
                </Button>
            </div>
        </form>
    );
};

export default BulkCategoryChange;
