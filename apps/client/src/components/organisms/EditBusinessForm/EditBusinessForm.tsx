import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input, Textarea } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { useCategories, useIndustries, useRegions } from '@/hooks/api';
import { CustomSelect } from '@/components/molecules/CustomSelect';
import type { Company, UpdateCompanyData } from '@contact-scraper/api/routers';
import { JsonEditor } from 'json-edit-react';
import { cn } from '@/lib/utils';

export interface EditBusinessFormProps {
    /**
     * Data firmy k editaci
     */
    company: Company;
    /**
     * Callback při uložení
     */
    onSave: (updatedBusiness: UpdateCompanyData) => void;
    /**
     * Callback při zrušení
     */
    onCancel: () => void;
    /**
     * Vlastní CSS třídy
     */
    className?: string;
}

/**
 * Organismická komponenta pro editaci firmy
 * 
 * @example
 * ```tsx
 * <EditBusinessForm
 *   company={selectedCompany}
 *   onSave={handleSave}
 *   onCancel={() => setEditModalOpen(false)}
 * />
 * ```
 */
export const EditBusinessForm: React.FC<EditBusinessFormProps> = ({
    company: business,
    onSave,
    onCancel,
    className
}) => {
    const { data: categories = [] } = useCategories();
    const { data: industries = [], isLoading: loadingIndustries } = useIndustries();
    const { data: regions = [], isLoading: loadingRegions } = useRegions();

    const { control, handleSubmit, register, formState: { errors } } = useForm<UpdateCompanyData>({
        defaultValues: {
            name: business.name || '',
            address: business.address || '',
            email: business.email || '',
            phone: business.phone || '',
            website: business.website || '',
            industryId: business.industry?.id,
            regionId: business.region?.id,
            categoryIds: business.categories?.map(cat => cat.id) || [],
            metadata: business.metadata
        }
    });

    const onSubmit = (data: UpdateCompanyData) => {
        let website: string | null | undefined = data?.website?.trim();
        if (website && !website.startsWith('http')) {
            website = `http://${website}`;
        } else if (!website) {
            website = null;
        }
        onSave({
            ...business,
            ...data,
            website,
            email: data?.email?.trim(),
        });
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
        <form
            onSubmit={handleSubmit(onSubmit)}
            className={cn("space-y-4 p-4 border rounded-lg bg-gray-50", className)}
        >

            <div className="flex flex-row gap-4">
                <div className="flex flex-col flex-grow w-1/2">
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                        Název
                    </label>
                    <Input
                        id="name"
                        className={errors.name ? 'border-red-500' : ''}
                        {...register('name')}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                    )}
                </div>

                <div className="flex flex-col flex-grow w-1/2">
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email
                    </label>
                    <Input
                        id="email"
                        className={errors.email ? 'border-red-500' : ''}
                        {...register('email', {
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: 'Neplatný formát emailu'
                            }
                        })}
                    />
                    {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                </div>
            </div>

            <div className="flex flex-row gap-4">
                <div className="flex flex-col flex-grow w-1/2">
                    <label htmlFor="phone" className="block text-sm font-medium mb-1">
                        Telefon
                    </label>
                    <Input id="phone" {...register('phone')} />
                </div>

                <div className="flex flex-col flex-grow w-1/2">
                    <label htmlFor="website" className="block text-sm font-medium mb-1">
                        Web
                    </label>
                    <Input id="website" {...register('website')} />
                </div>
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
                <label htmlFor="address" className="block text-sm font-medium mb-1">
                    Adresa
                </label>
                <Input id="address" {...register('address')} />
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
                            allowEmpty={false}
                            multiple
                        />
                    )}
                />
            </div>

            <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-1">
                    Popisek
                </label>
                <Textarea
                    id="notes"
                    rows={4}
                    cols={4}
                    className={cn('min-h-[60px]', errors.metadata?.notes ? 'border-red-500' : '')}
                    {...register('metadata.notes')}
                />
                {errors.metadata?.notes && (
                    <p className="text-red-500 text-xs mt-1">{errors.metadata.notes.message}</p>
                )}
            </div>

            <div className='max-h-[300px] overflow-y-auto'>
                <label htmlFor="metadata-data" className="block text-sm font-medium mb-1">
                    Data
                </label>
                <Controller
                    name="metadata.data"
                    control={control}
                    defaultValue={'{}'}
                    rules={{
                        validate: (value) => {
                            try {
                                JSON.parse(value!);
                                return true;
                            } catch (error) {
                                return 'Neplatná data';
                            }
                        }
                    }}
                    render={({ field: { onChange, value } }) => (
                        <JsonEditor
                            data={JSON.parse(value || '{}')}
                            setData={(data) => onChange(JSON.stringify(data))}
                        />
                    )}
                />
                {errors.metadata?.data && (
                    <p className="text-red-500 text-xs mt-1">{errors.metadata.data.message}</p>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button aria-label="cancel" type="button" variant="outline" onClick={onCancel}>
                    Zrušit
                </Button>
                <Button type="submit">
                    Uložit
                </Button>
            </div>
        </form>
    );
};

export default EditBusinessForm;
