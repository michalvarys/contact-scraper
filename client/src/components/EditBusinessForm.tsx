// src/components/EditBusinessForm.tsx
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Business } from '@/types/business';
import { useCategories } from '@/hooks/useCategories';
import { useIndustries } from '@/hooks/useIndustries';
import { useRegions } from '@/hooks/useRegions';
import { CustomSelect } from './CustomSelect';

interface EditBusinessFormProps {
    business: Business;
    onSave: (updatedBusiness: Business) => void;
    onCancel: () => void;
}

interface FormData {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    industryId?: number;
    regionId?: number;
    categoryIds?: number[];
}

export function EditBusinessForm({ business, onSave, onCancel }: EditBusinessFormProps) {
    const { data: categories = [] } = useCategories();
    const { data: industries = [], isLoading: loadingIndustries } = useIndustries();
    const { data: regions = [], isLoading: loadingRegions } = useRegions();

    const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            name: business.name || '',
            address: business.address || '',
            email: business.email || '',
            phone: business.phone || '',
            website: business.website || '',
            industryId: business.industry?.id,
            regionId: business.region?.id,
            categoryIds: business.categories?.map(cat => cat.id) || []
        }
    });

    const onSubmit = (data: FormData) => {
        // Připravíme aktualizovaný objekt business
        const updatedBusiness: Business = {
            ...business,
            ...data,
            // Přidáme objekty industry a region, pokud byly vybrány
            industry: data.industryId
                ? industries.find(ind => ind.id === data.industryId) || business.industry
                : undefined,
            region: data.regionId
                ? regions.find(reg => reg.id === data.regionId) || business.region
                : undefined,
            // Přidáme pole kategorií, pokud byly vybrány
            categories: data.categoryIds && data.categoryIds.length > 0
                ? data.categoryIds.map(id => categories.find(cat => cat.id === id))
                    .filter(cat => cat !== undefined)
                    .map(cat => cat as { id: number; name: string })
                : business.categories
        };

        onSave(updatedBusiness);
    };

    // Převedení dat do formátu požadovaného CustomSelect komponentou
    const categoryOptions = categories.map(category => ({
        id: category.id,
        value: category.id.toString(),
        label: category.name,
        data: category
    }));

    const industryOptions = industries.map(industry => ({
        id: industry.id,
        value: industry.id.toString(),
        label: industry.name,
        data: industry
    }));

    const regionOptions = regions.map(region => ({
        id: region.id,
        value: region.id.toString(),
        label: region.name,
        data: region
    }));

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Název
                </label>
                <Controller
                    name="name"
                    control={control}
                    rules={{ required: 'Název je povinný' }}
                    render={({ field }) => (
                        <Input
                            id="name"
                            {...field}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                    )}
                />
                {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <label htmlFor="address" className="block text-sm font-medium mb-1">
                    Adresa
                </label>
                <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="address"
                            {...field}
                        />
                    )}
                />
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                </label>
                <Controller
                    name="email"
                    control={control}
                    rules={{
                        pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Neplatný formát emailu'
                        }
                    }}
                    render={({ field }) => (
                        <Input
                            id="email"
                            type="email"
                            {...field}
                            className={errors.email ? 'border-red-500' : ''}
                        />
                    )}
                />
                {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
            </div>

            <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">
                    Telefon
                </label>
                <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="phone"
                            {...field}
                        />
                    )}
                />
            </div>

            <div>
                <label htmlFor="website" className="block text-sm font-medium mb-1">
                    Web
                </label>
                <Controller
                    name="website"
                    control={control}
                    render={({ field }) => (
                        <Input
                            id="website"
                            {...field}
                        />
                    )}
                />
            </div>

            <div>
                <label htmlFor="industry" className="block text-sm font-medium mb-1">
                    Odvětví
                </label>
                <Controller
                    name="industryId"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                        <CustomSelect
                            options={industryOptions}
                            value={value?.toString() || ''}
                            onChange={(val: string | string[]) => {
                                const value = Array.isArray(val) ? val[0] : val;
                                onChange(value ? Number(value) : undefined);
                            }}
                            isLoading={loadingIndustries}
                            placeholder="Vyberte odvětví"
                            searchPlaceholder="Vyhledat odvětví..."
                            noOptionsMessage="Žádná odvětví nenalezena"
                            loadingMessage="Načítání odvětví..."
                            emptyOptionLabel="Žádné odvětví"
                        />
                    )}
                />
            </div>

            <div>
                <label htmlFor="region" className="block text-sm font-medium mb-1">
                    Region
                </label>
                <Controller
                    name="regionId"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                        <CustomSelect
                            options={regionOptions}
                            value={value?.toString() || ''}
                            onChange={(val: string | string[]) => {
                                const value = Array.isArray(val) ? val[0] : val;
                                onChange(value ? Number(value) : undefined);
                            }}
                            isLoading={loadingRegions}
                            placeholder="Vyberte region"
                            searchPlaceholder="Vyhledat region..."
                            noOptionsMessage="Žádné regiony nenalezeny"
                            loadingMessage="Načítání regionů..."
                            emptyOptionLabel="Žádný region"
                        />
                    )}
                />
            </div>

            <div>
                <label htmlFor="categories" className="block text-sm font-medium mb-1">
                    Kategorie
                </label>
                <Controller
                    name="categoryIds"
                    control={control}
                    render={({ field: { value = [], onChange } }) => (
                        <CustomSelect
                            options={categoryOptions}
                            value={value.map(String)}
                            onChange={(val: string | string[]) => {
                                const newValue = Array.isArray(val) ? val.map(Number) : [];
                                onChange(newValue);
                            }}
                            placeholder="Vyberte kategorie"
                            searchPlaceholder="Vyhledat kategorie..."
                            noOptionsMessage="Žádné kategorie nenalezeny"
                            loadingMessage="Načítání kategorií..."
                            multiple={true}
                            allowEmpty={false}
                        />
                    )}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Zrušit
                </Button>
                <Button type="submit">
                    Uložit
                </Button>
            </div>
        </form>
    );
}
