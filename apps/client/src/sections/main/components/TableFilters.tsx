import CustomSelect from '@/components/molecules/CustomSelect';
import { useBusinessTable } from '../contexts/BusinessTableContext';
import BusinessTableFilters from './BusinessTableFilters';
import { useFilters } from '@/hooks/useFilters';

export function TableFilters() {
  const { filters, setFilter } = useFilters();
  const { selectedRows } = useBusinessTable();
  if (selectedRows.length !== 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4 flex flex-row">
      <BusinessTableFilters />
      <div className="!z-[21] flex items-center gap-2 mb-2 flex-grow">
        <CustomSelect
          placeholder="Vyberte duplicitní položky"
          className="min-w-[300px]"
          multiple
          value={filters.duplicates?.split(',').filter(Boolean) || []}
          options={[
            { id: 'email', label: 'Email', value: 'email' },
            { id: 'phone', label: 'Telefon', value: 'phone' },
            { id: 'website', label: 'Webovek', value: 'website' },
            { id: 'name', label: 'Název', value: 'name' },
          ]}
          onChange={(checked) => {
            console.log(checked);
            setFilter('duplicates', checked);
          }}
        />
      </div>
    </div>
  );
}
