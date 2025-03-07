import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useCategories } from "@/hooks/api";
import { useUrlFilters } from "@/hooks";
import { CustomSelect } from "@/components/molecules/CustomSelect";

interface FormData {
    /**
     * Vybraná kategorie
     */
    category: string;
}

export interface CategorySelectProps {
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Molekulární komponenta pro výběr kategorie
 * 
 * @example
 * ```tsx
 * <CategorySelect />
 * <CategorySelect className="w-64" />
 * ```
 */
export const CategorySelect: React.FC<CategorySelectProps> = ({ className }) => {
    const { data: categories = [], isLoading: loadingCategories } = useCategories();
    const { setFilter, getFilter } = useUrlFilters();
    const selectedCategory = getFilter('category', '');

    const { control } = useForm<FormData>({
        defaultValues: {
            category: selectedCategory
        }
    });

    // Převedení dat do formátu požadovaného CustomSelect komponentou
    const categoryOptions = categories.map(category => ({
        id: category.id,
        value: category.name,
        label: category.name,
        data: category
    }));

    const handleCategoryChange = (value: string | string[]) => {
        // Pro kategorii očekáváme pouze string, takže pokud přijde pole, vezmeme první hodnotu
        setFilter('category', Array.isArray(value) ? value[0] : value);
    };

    return (
        <div className={`category-filter ${className || ''}`}>
            <Controller
                name="category"
                control={control}
                render={({ field: { onChange } }) => (
                    <CustomSelect
                        options={categoryOptions}
                        value={selectedCategory}
                        onChange={(val: string | string[]) => {
                            onChange(val); // Aktualizujeme hodnotu v react-hook-form
                            handleCategoryChange(val); // Aktualizujeme filtr
                        }}
                        isLoading={loadingCategories}
                        placeholder="Vyberte kategorii"
                        searchPlaceholder="Vyhledat kategorii..."
                        noOptionsMessage="Žádné kategorie nenalezeny"
                        loadingMessage="Načítání kategorií..."
                        emptyOptionLabel="Všechny kategorie"
                    />
                )}
            />
        </div>
    );
};

export default CategorySelect;
