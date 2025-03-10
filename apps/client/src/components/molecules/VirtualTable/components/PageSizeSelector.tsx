import React, { memo } from 'react';

// Komponenta pro výběr velikosti stránky
const PageSizeSelector = memo(({
    pageSize,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
}: {
    pageSize: number;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: number[];
}) => (
    <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Záznamů na stránku:</span>
        <select
            className="border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
            {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                    {size}
                </option>
            ))}
        </select>
    </div>
));

PageSizeSelector.displayName = 'PageSizeSelector';

export default PageSizeSelector;
