import React from 'react';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { cn } from '@/lib/utils';
import type { Company, UpdateCompanyData } from '@contact-scraper/api/routers';

import { Input, Textarea } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { CategorySelect } from '@/components/molecules/CategorySelect';

import { JSONAccordion } from './JSONAccordion';
import { ScrapeEmailButton } from './ScrapeEmailButton';
import { VisitWebsiteButton } from './VisitWebsiteButton';
import { OdooActions } from './OdooActions';

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
  className,
}) => {
  const form = useForm<Omit<UpdateCompanyData, 'id'>>({
    defaultValues: {
      name: business.name || '',
      address: business.address || '',
      email: business.email || '',
      phone: business.phone || '',
      website: business.website || '',
      categoryIds: business.categories?.map((cat) => cat.id) || [],
      metadata: business.metadata,
    },
  });

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = form;

  const onSubmit = (data: Omit<UpdateCompanyData, 'id'>) => {
    // Validate name is not empty or whitespace
    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      form.setError('name', {
        type: 'manual',
        message: 'Název firmy je povinný',
      });
      return;
    }

    let website: string | null | undefined = data?.website?.trim();
    if (website && !website.startsWith('http')) {
      website = `http://${website}`;
    } else if (!website) {
      website = null;
    }
    onSave({
      id: business.id,
      name: trimmedName,
      address: data.address,
      email: data?.email?.trim() || null,
      phone: data.phone || null,
      website,
      categoryIds: data.categoryIds,
      metadata: data.metadata,
    });
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={cn('space-y-4 p-4 border rounded-lg bg-gray-50', className)}
      >
        <div className="flex flex-row gap-4">
          <div className="flex flex-col flex-grow w-1/2">
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Název <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              className={errors.name ? 'border-red-500' : ''}
              {...register('name', {
                required: 'Název firmy je povinný',
                validate: (value) => {
                  const trimmed = value?.trim();
                  if (!trimmed || trimmed.length === 0) {
                    return 'Název firmy nesmí být prázdný';
                  }
                  return true;
                },
              })}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col flex-grow w-1/2">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <div className="flex gap-2">
              <div className="flex-grow">
                <Input
                  id="email"
                  className={errors.email ? 'border-red-500' : ''}
                  {...register('email', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Neplatný formát emailu',
                    },
                  })}
                />
              </div>
              <ScrapeEmailButton />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
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
            <div className="flex gap-2">
              <div className="flex-grow">
                <Input id="website" {...register('website')} />
              </div>
              <VisitWebsiteButton />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="categories" className="block text-sm font-medium mb-1">
            Kategorie
          </label>
          <Controller
            name="categoryIds"
            control={control}
            render={({ field: { value = [], onChange } }) => (
              <CategorySelect multiple value={value.map(String)} onChange={onChange} />
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

        <JSONAccordion />

        {/* Odoo Actions Section */}
        <OdooActions company={business} />

        <div className="flex justify-end gap-2 pt-2">
          <Button aria-label="cancel" type="button" variant="outline" onClick={onCancel}>
            Zrušit
          </Button>
          <Button type="submit">Uložit</Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default EditBusinessForm;
