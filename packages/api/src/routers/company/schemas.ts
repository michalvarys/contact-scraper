import { z } from 'zod';

const filterBooleanSchema = z.enum(['true', 'false', 'all']).optional();
export type FiltersType = z.infer<typeof companyQueryParamsSchema>;
export type FilterBooleanType = z.infer<typeof filterBooleanSchema>;
const filterSortSchema = z.enum([
  'name',
  'address',
  'reviewsCount',
  'email',
  'website',
  'phone',
  'scrapedAt',
]);
export type SortByType = z.infer<typeof filterSortSchema>; //FiltersType['sortBy'];
export type SortDirType = FiltersType['sortDir'];
export const companyQueryParamsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  keyword: z.string().optional(),
  category: z.string().optional(),
  hasWebsite: filterBooleanSchema,
  hasPhone: filterBooleanSchema,
  hasEmail: filterBooleanSchema,
  sortBy: z
    .enum(['name', 'address', 'reviewsCount', 'email', 'website', 'phone', 'scrapedAt'])
    .optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  // Duplicitní filtr - seznam vlastností pro filtrování duplicit
  duplicates: z.string().optional(), // z.enum(['email', 'phone', 'website', 'name']).optional(),
});

export const companyQueryOutputSchema = z.object({
  data: z.array(
    z.object({
      odooMailingContactId: z.number().nullable(),
      id: z.string(),
      name: z.string(),
      address: z.string(),
      email: z.string().nullable(),
      phone: z.string().nullable(),
      website: z.string().nullable(),
      link: z.string(),
      scrapedAt: z.date(),
      categories: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
        }),
      ),
      metadata: z
        .object({
          id: z.string(),
          notes: z.string().nullable().optional(),
          data: z.string().nullable().optional(),
        })
        .optional()
        .nullable(),
    }),
  ),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    pages: z.number(),
  }),
});

// Schéma pro aktualizaci firmy
export const updateCompanySchema = z.object({
  id: z.string(),
  name: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (val === undefined) return true; // Optional is ok
        const trimmed = val?.trim();
        return trimmed && trimmed.length > 0;
      },
      {
        message: 'Název firmy nesmí být prázdný nebo složený pouze z mezer',
      },
    ),
  address: z.string().optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  categoryIds: z.array(z.number()).optional(),
  metadata: z
    .object({
      id: z.string().optional(),
      notes: z.string().nullable().optional(),
      data: z.string().nullable().optional(),
    })
    .optional()
    .nullable(),
});

// Schéma pro hromadnou aktualizaci kategorie
export const bulkUpdateCategorySchema = z.object({
  businessIds: z.array(z.string()),
  categoryId: z.number(),
});

// Schéma pro hromadné mazání
export const bulkDeleteSchema = z.object({
  businessIds: z.array(z.string()),
});
