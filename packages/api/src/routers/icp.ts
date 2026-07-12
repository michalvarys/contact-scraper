import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@contact-scraper/db';
import {
  enrichIcpProfile,
  generateSearchQueries,
  scoreCompany,
  scoreCompanies,
  scoreTaskCompanies,
} from '@contact-scraper/scrapers/src/services/IcpService';
import type { AiProvider } from '@contact-scraper/scrapers/src/services/IcpService';

const aiProviderSchema = z.enum(['claude', 'gemini']).optional();

export const icpRouter = router({
  list: publicProcedure.query(async () => {
    return prisma.icpProfile.findMany({
      include: { category: true, _count: { select: { companyScores: true, scraperTasks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const icp = await prisma.icpProfile.findUnique({
        where: { id: input.id },
        include: {
          category: true,
          scraperTasks: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: { select: { companyScores: true } },
        },
      });
      if (!icp) throw new TRPCError({ code: 'NOT_FOUND', message: 'ICP profil nenalezen' });
      return icp;
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        scoreThreshold: z.number().int().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.icpProfile.create({
        data: {
          name: input.name,
          description: input.description,
          scoreThreshold: input.scoreThreshold ?? 60,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        scoreThreshold: z.number().int().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.icpProfile.update({ where: { id }, data });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.icpCompanyScore.deleteMany({ where: { icpId: input.id } });
      return prisma.icpProfile.delete({ where: { id: input.id } });
    }),

  enrich: publicProcedure
    .input(z.object({ id: z.string(), modelId: z.string().optional(), provider: aiProviderSchema }))
    .mutation(async ({ input }) => {
      enrichIcpProfile(input.id, input.modelId, input.provider || 'claude')
        .then(() => console.log(`[ICP] Enrichment done for ${input.id}`))
        .catch((err) => console.error(`[ICP] Enrichment failed for ${input.id}:`, err.message));
      return { status: 'processing' };
    }),

  generateQueries: publicProcedure
    .input(
      z.object({
        id: z.string(),
        location: z.string().optional(),
        modelId: z.string().optional(),
        provider: aiProviderSchema,
      }),
    )
    .mutation(async ({ input }) => {
      generateSearchQueries(input.id, input.location, input.modelId, input.provider || 'claude')
        .then(() => console.log(`[ICP] Queries generated for ${input.id}`))
        .catch((err) => console.error(`[ICP] Query generation failed for ${input.id}:`, err.message));
      return { status: 'processing' };
    }),

  scoreCompany: publicProcedure
    .input(
      z.object({
        companyId: z.string(),
        icpId: z.string(),
        modelId: z.string().optional(),
        provider: aiProviderSchema,
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await scoreCompany(input.companyId, input.icpId, input.modelId, input.provider || 'claude');
      } catch (err: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Scoring selhalo',
        });
      }
    }),

  scoreCompanies: publicProcedure
    .input(
      z.object({
        companyIds: z.array(z.string()),
        icpId: z.string(),
        modelId: z.string().optional(),
        provider: aiProviderSchema,
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await scoreCompanies(input.companyIds, input.icpId, undefined, input.modelId, input.provider || 'claude');
      } catch (err: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Batch scoring selhalo',
        });
      }
    }),

  scoreTaskCompanies: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        modelId: z.string().optional(),
        provider: aiProviderSchema,
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await scoreTaskCompanies(input.taskId, undefined, input.modelId, input.provider || 'claude');
      } catch (err: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Task scoring selhalo',
        });
      }
    }),

  getScores: publicProcedure
    .input(
      z.object({
        icpId: z.string(),
        minScore: z.number().int().min(0).max(100).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      }),
    )
    .query(async ({ input }) => {
      return prisma.icpCompanyScore.findMany({
        where: {
          icpId: input.icpId,
          ...(input.minScore != null ? { score: { gte: input.minScore } } : {}),
        },
        include: {
          company: {
            include: { categories: true },
          },
        },
        orderBy: { score: 'desc' },
        take: input.limit ?? 100,
      });
    }),
});
