import { z } from 'zod';

export const companyQueryParamsSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  keyword: z.string().optional(),
  category: z.string().optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
  hasWebsite: z.enum(['true', 'false', 'all']).optional(),
  hasPhone: z.enum(['true', 'false', 'all']).optional(),
  hasEmail: z.enum(['true', 'false', 'all']).optional(),
  sortBy: z
    .enum(['name', 'address', 'reviewsCount', 'email', 'website', 'phone', 'scrapedAt'])
    .optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
});

export const companyQueryOutputSchema = z.object({
  data: z.array(
    z.object({
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
      industry: z
        .object({
          id: z.number(),
          name: z.string(),
        })
        .nullable(),
      region: z
        .object({
          id: z.number(),
          name: z.string(),
        })
        .nullable(),
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
  name: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  categoryIds: z.array(z.number()).optional(),
  industryId: z.number().optional().nullable(),
  regionId: z.number().optional().nullable(),
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
