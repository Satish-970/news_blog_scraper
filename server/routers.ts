import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllCategories,
  getCategoryBySlug,
  getLatestArticles,
  getArticlesByCategoryId,
  searchArticles,
  getArticleBySlug,
  publishArticle,
  unpublishArticle,
  deleteArticle,
  getScrapeLogs,
  getScrapeLogsByCategory,
} from "./db";
import { runScrapeAndPublishPipeline } from "./pipeline";
import { generateAllDemoArticles, generateDemoArticles } from "./demoGenerator";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ PUBLIC BLOG ROUTERS ============

  blog: router({
    // Get all categories
    categories: publicProcedure.query(async () => {
      return getAllCategories();
    }),

    // Get latest articles (homepage)
    latest: publicProcedure
      .input(
        z.object({
          limit: z.number().default(12),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return getLatestArticles(input.limit, input.offset);
      }),

    // Get articles by category
    byCategory: publicProcedure
      .input(
        z.object({
          categorySlug: z.string(),
          limit: z.number().default(10),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const category = await getCategoryBySlug(input.categorySlug);
        if (!category) throw new Error("Category not found");
        return getArticlesByCategoryId(category.id, input.limit, input.offset);
      }),

    // Get single article by slug
    article: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const article = await getArticleBySlug(input.slug);
        if (!article) throw new Error("Article not found");
        return article;
      }),

    // Search articles
    search: publicProcedure
      .input(
        z.object({
          query: z.string(),
          limit: z.number().default(10),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return searchArticles(input.query, input.limit, input.offset);
      }),

    // Get related articles (same category)
    related: publicProcedure
      .input(
        z.object({
          articleId: z.number(),
          categoryId: z.number(),
          limit: z.number().default(3),
        })
      )
      .query(async ({ input }) => {
        const articles = await getArticlesByCategoryId(input.categoryId, input.limit + 1);
        return articles.filter((a) => a.id !== input.articleId).slice(0, input.limit);
      }),
  }),

  // ============ ADMIN ROUTERS ============

  admin: router({
    // Generate demo articles for testing
    generateDemo: adminProcedure
      .input(
        z.object({
          categorySlug: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          if (input.categorySlug) {
            const result = await generateDemoArticles(input.categorySlug);
            return result;
          } else {
            const results = await generateAllDemoArticles();
            return { success: true, results };
          }
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),

    // Manually trigger scrape and publish pipeline
    triggerScrape: adminProcedure
      .input(
        z.object({
          categorySlug: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await runScrapeAndPublishPipeline(input.categorySlug);
          return { success: true, message: "Pipeline executed successfully" };
        } catch (error) {
          return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),

    // Get all scrape logs
    scrapeLogs: adminProcedure
      .input(
        z.object({
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        return getScrapeLogs(input.limit, input.offset);
      }),

    // Get scrape logs for a specific category
    scrapeLogsByCategory: adminProcedure
      .input(
        z.object({
          categorySlug: z.string(),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        const category = await getCategoryBySlug(input.categorySlug);
        if (!category) throw new Error("Category not found");
        return getScrapeLogsByCategory(category.id, input.limit);
      }),

    // Publish an article
    publishArticle: adminProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        await publishArticle(input.articleId);
        return { success: true };
      }),

    // Unpublish an article
    unpublishArticle: adminProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        await unpublishArticle(input.articleId);
        return { success: true };
      }),

    // Delete an article
    deleteArticle: adminProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteArticle(input.articleId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
