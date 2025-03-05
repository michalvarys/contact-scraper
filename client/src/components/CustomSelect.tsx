import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface SelectOption<T> {
  id: string | number;
  value: string;
  label: string | ReactNode;
  data?: T; // Volitelná originální data pro každou položku
}

interface CustomSelectProps<T> {
  options: SelectOption<T>[];
  value: string;
  onChange: (value: string, data?: T) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noOptionsMessage?: string;
  loadingMessage?: string;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  filterFunction?: (option: SelectOption<T>, search: string) => boolean;
}

const CustomSelect = <T extends unknown>({
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
}: CustomSelectProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Výchozí funkce pro filtrování
  const defaultFilterFunction = (option: SelectOption<T>, searchTerm: string) =>
    option?.label?.toString().toLowerCase().includes(searchTerm.toLowerCase());

  // Použij vlastní nebo výchozí funkci pro filtrování
  const filter = filterFunction || defaultFilterFunction;

  // Filtruj možnosti podle vyhledávacího výrazu
  const filteredOptions = options.filter(option => filter(option, search));

  // Zavře dropdown když uživatel klikne mimo
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

  // Při otevření dropdownu zaměří vyhledávací pole
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

  // Získá zobrazovanou hodnotu vybraného prvku
  const getDisplayValue = () => {
    if (!value && allowEmpty) return emptyOptionLabel;
    const selectedOption = options.find(option => option.value === value);
    return selectedOption ? selectedOption.label : placeholder;
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
      {/* Trigger button */}
      <div
        className={`select-trigger border p-1.5 rounded-lg flex justify-between items-center ${disabled ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer'}`}
        onClick={toggleDropdown}
      >
        <span>{getDisplayValue()}</span>
        <span className="arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div className="dropdown-menu absolute w-full mt-1 border rounded-lg bg-white shadow-md z-10">
          {/* Vyhledávací pole */}
          <div className="p-2 border-b">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-1 border rounded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Seznam možností */}
          <div className="options-list max-h-60 overflow-y-auto">
            {allowEmpty && (
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
                  className={`option p-2 hover:bg-gray-100 cursor-pointer ${value === option.value ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSelect(option.value, option.data)}
                >
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
};

export default CustomSelect;