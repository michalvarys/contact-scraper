import { z } from 'zod';
import { publicProcedure, router } from '../../trpc';
import { createFilter, createOrderBy } from './utils';
import {
  bulkDeleteSchema,
  bulkUpdateCategorySchema,
  companyQueryOutputSchema,
  companyQueryParamsSchema,
  updateCompanySchema,
} from './schemas';
import { Prisma } from '@contact-scraper/db';

export const companyRouter = router({
  // Získání seznamu firem s filtrováním a stránkováním
  getCompanies: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/company.getCompanies',
        description: 'Získání seznamu firem s filtrováním a stránkováním',
        tags: ['Company'],
      },
    })
    .input(companyQueryParamsSchema)
    .output(companyQueryOutputSchema)
    .query(async ({ input, ctx }) => {
      const { page = '1', limit = '10' } = input;

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const skip = (pageNumber - 1) * limitNumber;

      // Vytvoření filtru na základě query parametrů
      const where = createFilter(input);

      // Vytvoření řazení na základě query parametrů
      const orderBy = createOrderBy(input);

      const duplicates = (input.duplicates?.split(',') || []).filter(
        Boolean,
      ) as Prisma.CompanyScalarFieldEnum[];

      // Filtrování duplicitních záznamů
      if (duplicates.length) {
        const duplicateConditions: Prisma.CompanyWhereInput[] = [];

        for (const field of duplicates) {
          const duplicates = await ctx.prisma.company.groupBy({
            by: [field],
            where: {
              [field]: {
                not: null,
              },
            },
            _count: {
              [field]: true, // Počet výskytů daného pole
            },
          });

          const duplicateValues = duplicates
            .filter((d) => d._count[field] > 1)
            .map((d) => d[field]);

          if (duplicateValues.length > 0) {
            duplicateConditions.push({
              [field]: {
                in: duplicateValues,
              },
            });
          }
        }

        if (duplicateConditions.length > 0) {
          where.OR = duplicateConditions;
        }
      }

      // Získání firem s filtrováním a stránkováním
      const companies = await ctx.prisma.company.findMany({
        where,
        include: {
          categories: true,
          metadata: {
            include: {
              website: true,
            },
          },
        },
        skip,
        take: limitNumber,
        orderBy,
      });

      // Získání celkového počtu firem pro stránkování
      const total = await ctx.prisma.company.count({ where });

      return {
        data: companies,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(total / limitNumber),
        },
      };
    }),

  // Získání kategorií
  getCategories: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.category.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }),

  // Aktualizace firmy
  updateCompany: publicProcedure.input(updateCompanySchema).mutation(async ({ input, ctx }) => {
    const { id, categoryIds, ...data } = input;

    // Trim string fields to prevent whitespace-only values
    const sanitizedData = {
      ...data,
      name: data.name?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      website: data.website?.trim() || undefined,
      address: data.address?.trim() || undefined,
    };

    // Aktualizace firmy
    const updatedCompany = await ctx.prisma.company.update({
      where: { id },
      data: {
        ...sanitizedData,
        metadata: {
          connectOrCreate: {
            where: {
              companyId: id,
            },
            create: {
              notes: data?.metadata?.notes,
              data: data?.metadata?.data,
            },
          },
          update: data?.metadata?.id
            ? {
                notes: data.metadata.notes ?? undefined,
                data: data.metadata.data ?? undefined,
                // website: data.metadata.website ?? undefined,
              }
            : undefined,
        },
        // Aktualizace kategorií, pokud byly poskytnuty
        ...(categoryIds && {
          categories: {
            set: [],
            connect: categoryIds.map((categoryId) => ({ id: categoryId })),
          },
        }),
      },
      include: {
        categories: true,
        metadata: true,
      },
    });

    return {
      success: true,
      data: updatedCompany,
    };
  }),

  // Smazání firmy
  deleteCompany: publicProcedure.input(z.string()).mutation(async ({ input, ctx }) => {
    await ctx.prisma.company.delete({
      where: { id: input },
    });

    return {
      success: true,
      message: 'Firma byla úspěšně smazána',
    };
  }),

  // Hromadná aktualizace kategorie
  bulkUpdateCategory: publicProcedure
    .input(bulkUpdateCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const { businessIds, categoryId } = input;

      // Aktualizace kategorií pro všechny vybrané firmy
      const updatePromises = businessIds.map((id) =>
        ctx.prisma.company.update({
          where: { id },
          data: {
            categories: {
              connect: { id: categoryId },
            },
          },
        }),
      );

      await Promise.all(updatePromises);

      return {
        success: true,
        count: businessIds.length,
        message: `${businessIds.length} firem bylo úspěšně aktualizováno`,
      };
    }),

  // Hromadné mazání
  bulkDelete: publicProcedure.input(bulkDeleteSchema).mutation(async ({ input, ctx }) => {
    const { businessIds } = input;

    // Transakce pro zajištění atomicity operace
    return await ctx.prisma.$transaction(async (prisma) => {
      // 1. Nejprve získáme ID všech metadat pro vybrané firmy
      const metadataIds = await prisma.companyMetadata.findMany({
        where: {
          companyId: {
            in: businessIds,
          },
        },
        select: {
          id: true,
        },
      });

      const metadataIdsArray = metadataIds.map((m) => m.id);

      // 2. Smažeme všechny záznamy CompanyWebsite spojené s těmito metadaty
      if (metadataIdsArray.length > 0) {
        await prisma.companyWebsite.deleteMany({
          where: {
            metadataId: {
              in: metadataIdsArray,
            },
          },
        });
      }

      // 3. Smažeme všechna metadata spojená s vybranými firmami
      await prisma.companyMetadata.deleteMany({
        where: {
          companyId: {
            in: businessIds,
          },
        },
      });

      // 4. Odpojíme všechny kategorie od firem (many-to-many relace)
      for (const id of businessIds) {
        await prisma.company.update({
          where: { id },
          data: {
            categories: {
              set: [], // Odpojení všech kategorií
            },
          },
        });
      }

      // 5. Nakonec smažeme samotné firmy
      await prisma.company.deleteMany({
        where: {
          id: {
            in: businessIds,
          },
        },
      });

      return {
        success: true,
        count: businessIds.length,
        message: `${businessIds.length} firem bylo úspěšně smazáno včetně všech relací`,
      };
    });
  }),
});
