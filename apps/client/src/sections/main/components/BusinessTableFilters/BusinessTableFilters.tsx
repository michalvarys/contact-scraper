import React, { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { CategorySelectFilter } from '@/components/organisms/CategorySelectFilter';
import { useUrlFilters } from '@/hooks/ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/utils';
import CustomSelect from '../../../../components/molecules/CustomSelect';

export interface BusinessTableFiltersProps {
    /**
     * Callback pro resetování filtrů
     */
    onResetFilters?: () => void;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Molekulární komponenta pro filtry tabulky firem
 *
 * @example
 * ```tsx
 * <BusinessTableFilters onResetFilters={handleResetFilters} />
 * ```
 */
export const BusinessTableFilters: React.FC<BusinessTableFiltersProps> = ({
    onResetFilters,
    className,
}) => {
    const { filters, setFilter, resetFilters } = useUrlFilters();
    const [searchTerm, setSearchTerm] = useState(filters.keyword || '');

    useDebounce(
        () => {
            setFilter('keyword', searchTerm);
        },
        1000,
        [searchTerm],
    );

    // Funkce pro resetování filtrů
    const handleResetFilters = () => {
        resetFilters();
        setSearchTerm('');
        onResetFilters?.();
    };

    return (
        <div className={cn('flex gap-2 items-center flex-wrap w-full', className)}>
            <Input
                placeholder="Hledat podle názvu nebo adresy"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-[300px]"
            />

            <CategorySelectFilter />

            <CustomSelect
                className="w-32"
                options={[
                    { id: 'all', value: 'all', label: 'Web vše' },
                    { id: 'true', value: 'true', label: 'S webem' },
                    { id: 'false', value: 'false', label: 'Bez webu' },
                ]}
                onChange={(value) => setFilter('hasWebsite', value as string)}
                value={filters.hasWebsite || 'all'}
            />

            <CustomSelect
                className="w-32"
                options={[
                    { id: 'all', value: 'all', label: 'Email vše' },
                    { id: 'true', value: 'true', label: 'S eailem' },
                    { id: 'false', value: 'false', label: 'Bez emailu' },
                ]}
                onChange={(value) => setFilter('hasEmail', value as string)}
                value={filters.hasEmail || 'all'}
            />

            <CustomSelect
                className="w-32"
                options={[
                    { id: 'all', value: 'all', label: 'Telefon vše' },
                    { id: 'true', value: 'true', label: 'S telefonem' },
                    { id: 'false', value: 'false', label: 'Bez telefonu' },
                ]}
                onChange={(value) => setFilter('hasPhone', value as string)}
                value={filters.hasPhone || 'all'}
            />

            <Button variant="outline" size="icon" onClick={handleResetFilters} title="Resetovat filtry">
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
};

export default BusinessTableFilters;
