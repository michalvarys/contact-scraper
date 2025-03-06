import { useForm, Controller } from 'react-hook-form';
import { useCategories } from "@/hooks/useCategories";
import { useFilters } from "@/hooks/useFilters";
import { CustomSelect } from "./CustomSelect";

interface FormData {
    category: string;
}

export const CategorySelect = () => {
    const { data: categories = [], isLoading: loadingCategories } = useCategories();
    const { setFilter, searchParams } = useFilters();
    const selectedCategory = (searchParams.get('category') || '') as string;

    const { control } = useForm<FormData>({
        defaultValues: {
            category: selectedCategory
        }
    });

    // Převedení dat do formátu požadovaného generickou komponentou
    const categoryOptions = categories.map(category => ({
        id: category.id,
        value: category.name,
        label: category.name,
        data: category // původní objekt kategorie
    }));

    const handleCategoryChange = (value: string | string[]) => {
        // Pro kategorii očekáváme pouze string, takže pokud přijde pole, vezmeme první hodnotu
        setFilter('category', Array.isArray(value) ? value[0] : value);
    };

    return (
        <div className="category-filter">
            <Controller
                name="category"
                control={control}
                render={({ field: { onChange } }) => (
                    <CustomSelect
                        options={categoryOptions}
                        value={selectedCategory} // Použijeme hodnotu z URL parametrů
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
