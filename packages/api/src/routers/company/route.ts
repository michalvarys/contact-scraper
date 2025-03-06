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

      // Získání firem s filtrováním a stránkováním
      const companies = await ctx.prisma.company.findMany({
        where,
        include: {
          categories: true,
          industry: true,
          region: true,
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

  // Získání průmyslových odvětví
  getIndustries: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.industry.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }),

  // Získání regionů
  getRegions: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.region.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }),

  // Aktualizace firmy
  updateCompany: publicProcedure.input(updateCompanySchema).mutation(async ({ input, ctx }) => {
    const { id, categoryIds, ...data } = input;

    // Aktualizace firmy
    const updatedCompany = await ctx.prisma.company.update({
      where: { id },
      data: {
        ...data,
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
        industry: true,
        region: true,
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

    // Smazání všech vybraných firem
    await ctx.prisma.company.deleteMany({
      where: {
        id: {
          in: businessIds,
        },
      },
    });

    return {
      success: true,
      count: businessIds.length,
      message: `${businessIds.length} firem bylo úspěšně smazáno`,
    };
  }),
});
