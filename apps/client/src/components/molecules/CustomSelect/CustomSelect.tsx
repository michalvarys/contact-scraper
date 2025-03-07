import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Input } from '@/components/atoms/Input';

export interface SelectOption<T> {
    /**
     * Unikátní identifikátor položky
     */
    id: string | number;
    /**
     * Hodnota položky pro formulář
     */
    value: string;
    /**
     * Zobrazovaný text nebo komponenta
     */
    label: string | ReactNode;
    /**
     * Volitelná dodatečná data
     */
    data?: T;
}

export interface CustomSelectProps<T> {
    /**
     * Seznam položek pro výběr
     */
    options: SelectOption<T>[];
    /**
     * Aktuálně vybraná hodnota nebo hodnoty
     */
    value: string | string[];
    /**
     * Callback při změně hodnoty
     */
    onChange: (value: string | string[], data?: T | T[]) => void;
    /**
     * Text placeholderu
     */
    placeholder?: string;
    /**
     * Text placeholderu pro vyhledávání
     */
    searchPlaceholder?: string;
    /**
     * Text při nenalezení položek
     */
    noOptionsMessage?: string;
    /**
     * Text při načítání
     */
    loadingMessage?: string;
    /**
     * Zda se načítají data
     */
    isLoading?: boolean;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
    /**
     * Zda je select zakázaný
     */
    disabled?: boolean;
    /**
     * Zda povolit prázdnou hodnotu
     */
    allowEmpty?: boolean;
    /**
     * Text pro prázdnou hodnotu
     */
    emptyOptionLabel?: string;
    /**
     * Vlastní funkce pro filtrování
     */
    filterFunction?: (option: SelectOption<T>, search: string) => boolean;
    /**
     * Zda povolit vícenásobný výběr
     */
    multiple?: boolean;
}

/**
 * Molekulární komponenta pro vlastní select s vyhledáváním
 * 
 * @example
 * ```tsx
 * <CustomSelect
 *   options={[
 *     { id: 1, value: "1", label: "Option 1" },
 *     { id: 2, value: "2", label: "Option 2" }
 *   ]}
 *   value="1"
 *   onChange={(value) => console.log(value)}
 * />
 * 
 * // S vícenásobným výběrem
 * <CustomSelect
 *   options={options}
 *   value={["1", "2"]}
 *   onChange={(values) => console.log(values)}
 *   multiple
 * />
 * ```
 */
export function CustomSelect<T>({
    options,
    value,
    onChange,
    placeholder = 'Vyberte...',
    searchPlaceholder = 'Vyhledat...',
    noOptionsMessage = 'Žádné položky nenalezeny',
    loadingMessage = 'Načítání...',
    isLoading = false,
    className = '',
    disabled = false,
    allowEmpty = true,
    emptyOptionLabel = 'Všechny položky',
    filterFunction,
    multiple = false,
}: CustomSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const defaultFilterFunction = (option: SelectOption<T>, searchTerm: string) =>
        option?.label?.toString().toLowerCase().includes(searchTerm.toLowerCase());

    const filter = filterFunction || defaultFilterFunction;

    const filteredOptions = options.filter(option => filter(option, search));

    useEffect(() => {
        if (disabled) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [disabled]);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string, optionData?: T) => {
        onChange(optionValue, optionData);
        setIsOpen(false);
        setSearch('');
    };

    const getDisplayValue = () => {
        if (multiple) {
            if (Array.isArray(value) && value.length > 0) {
                const selectedOptions = options.filter(option => value.includes(option.value));
                return selectedOptions.map(option => option.label).join(', ');
            }
            return placeholder;
        } else {
            if (!value && allowEmpty) return emptyOptionLabel;
            const selectedOption = options.find(option => option.value === value);
            return selectedOption ? selectedOption.label : placeholder;
        }
    };

    const toggleValue = (optionValue: string, optionData?: T) => {
        if (!multiple) {
            onChange(optionValue, optionData);
            setIsOpen(false);
            return;
        }

        const currentValues = Array.isArray(value) ? value : [];

        if (currentValues.includes(optionValue)) {
            const newValues = currentValues.filter(v => v !== optionValue);
            const newData = options
                .filter(option => newValues.includes(option.value))
                .map(option => option.data)
                .filter((data): data is T => data !== undefined);

            onChange(newValues, newData);
        } else {
            const newValues = [...currentValues, optionValue];
            const newData = options
                .filter(option => newValues.includes(option.value))
                .map(option => option.data)
                .filter((data): data is T => data !== undefined);

            onChange(newValues, newData);
        }
    };

    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                setSearch('');
            }
        }
    };

    return (
        <div className={`custom-select-container relative ${className} ${disabled ? 'opacity-50' : ''}`} ref={dropdownRef}>
            <div
                className={`select-trigger border p-1.5 rounded-lg flex justify-between items-center ${disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer'}`}
                onClick={toggleDropdown}
            >
                <span>{getDisplayValue()}</span>
                <span className="arrow">{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && !disabled && (
                <div className="dropdown-menu absolute w-full mt-1 border rounded-lg bg-white shadow-md z-10">
                    <div className="p-2 border-b">
                        <Input
                            ref={searchInputRef}
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full p-1 border rounded"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="options-list max-h-60 overflow-y-auto">
                        {allowEmpty && !multiple && (
                            <div
                                className={`option p-2 hover:bg-gray-100 cursor-pointer ${!value ? 'bg-blue-100' : ''}`}
                                onClick={() => handleSelect('')}
                            >
                                {emptyOptionLabel}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="p-2 text-center text-gray-500">{loadingMessage}</div>
                        ) : filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div
                                    key={option.id}
                                    className={`option p-2 hover:bg-gray-100 cursor-pointer flex items-center ${multiple
                                        ? 'justify-start'
                                        : value === option.value
                                            ? 'bg-blue-100'
                                            : ''
                                        }`}
                                    onClick={() => toggleValue(option.value, option.data)}
                                >
                                    {multiple && (
                                        <input
                                            type="checkbox"
                                            checked={Array.isArray(value) && value.includes(option.value)}
                                            onChange={() => { }} // Změny řešíme přes onClick na divu
                                            className="mr-2"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    )}
                                    {option.label}
                                </div>
                            ))
                        ) : (
                            <div className="p-2 text-center text-gray-500">{noOptionsMessage}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomSelect;
