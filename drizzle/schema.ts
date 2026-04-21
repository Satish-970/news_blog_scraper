import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, longtext } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categories table for blog content organization
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(), // "Stocks", "Technology", "Space"
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Articles table for storing generated blog posts
 */
export const articles = mysqlTable("articles", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(), // Foreign key to categories
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  summary: text("summary").notNull(), // Short excerpt
  content: longtext("content").notNull(), // Full article body
  sourceUrl: varchar("sourceUrl", { length: 512 }), // Original news source URL
  imageUrl: varchar("imageUrl", { length: 512 }), // Featured image URL
  published: boolean("published").default(false).notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = typeof articles.$inferInsert;

/**
 * Scrape logs table for tracking scraping operations
 */
export const scrapeLogs = mysqlTable("scrapeLogs", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(), // Which category was scraped
  status: mysqlEnum("status", ["pending", "running", "completed", "failed"]).default("pending").notNull(),
  articlesScraped: int("articlesScraped").default(0).notNull(),
  articlesGenerated: int("articlesGenerated").default(0).notNull(),
  articlesPublished: int("articlesPublished").default(0).notNull(),
  errorMessage: text("errorMessage"), // Error details if status is "failed"
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScrapeLog = typeof scrapeLogs.$inferSelect;
export type InsertScrapeLog = typeof scrapeLogs.$inferInsert;

/**
 * Raw news items table for storing scraped news before AI generation
 */
export const rawNews = mysqlTable("rawNews", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 512 }).notNull().unique(),
  imageUrl: varchar("imageUrl", { length: 512 }),
  source: varchar("source", { length: 128 }), // e.g., "NewsAPI", "RSS Feed"
  publishedAt: timestamp("publishedAt"),
  processed: boolean("processed").default(false).notNull(),
  articleId: int("articleId"), // Reference to generated article
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RawNews = typeof rawNews.$inferSelect;
export type InsertRawNews = typeof rawNews.$inferInsert;
