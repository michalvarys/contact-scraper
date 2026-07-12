import CustomSelect, { CustomSelectProps } from "@/components/molecules/CustomSelect";
import { useCategories } from "@/hooks";
import { useMemo } from "react";

export function CategorySelect<T extends unknown>({ multiple, value, onChange }: Pick<CustomSelectProps<T>, 'value' | 'onChange' | 'multiple'>) {
    const { data: categories = [] } = useCategories();

    // Převedení dat do formátu požadovaného CustomSelect komponentou
    const categoryOptions = useMemo(() => categories.map((category) => ({
        id: category.id,
        value: category.id.toString(),
        label: category.name,
        data: category,
    })), [categories])


    const selectValue = useMemo(() => multiple ?
        typeof value === 'string'
            ? [value]
            : value.map(String)
        : Array.isArray(value)
            ? value[0]
            : value, [multiple, value])

    return (
        <CustomSelect
            options={categoryOptions}
            value={selectValue}
            onChange={(val: string | string[]) => {
                const newValue = Array.isArray(val) ? val.map(Number) : [];
                onChange(newValue);
            }}
            placeholder="Vyberte kategorie"
            searchPlaceholder="Vyhledat kategorie..."
            noOptionsMessage="Žádné kategorie nenalezeny"
            loadingMessage="Načítání kategorií..."
            allowEmpty={false}
            multiple={multiple}
        />
    )
}
