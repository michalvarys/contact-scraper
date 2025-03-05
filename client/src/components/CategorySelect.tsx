import { useCategories } from "@/hooks/useCategories";
import { useFilters } from "@/hooks/useFilters";
import CustomSelect from "./CustomSelect";

export const CategorySelect = () => {
    const { data: categories = [], isLoading: loadingCategories } = useCategories();
    const { setFilter, searchParams } = useFilters();
    const selectedCategory = (searchParams.get('category') || '') as string;

    // Převedení dat do formátu požadovaného generickou komponentou
    const categoryOptions = categories.map(category => ({
        id: category.id,
        value: category.name,
        label: category.name,
        data: category // původní objekt kategorie
    }));

    const handleCategoryChange = (value: string) => {
        setFilter('category', value);
    };

    return (
        <div className="category-filter">
            <CustomSelect
                options={categoryOptions}
                value={selectedCategory}
                onChange={handleCategoryChange}
                isLoading={loadingCategories}
                placeholder="Vyberte kategorii"
                searchPlaceholder="Vyhledat kategorii..."
                noOptionsMessage="Žádné kategorie nenalezeny"
                loadingMessage="Načítání kategorií..."
                emptyOptionLabel="Všechny kategorie"
            />
        </div>
    );
};

export default CategorySelect;