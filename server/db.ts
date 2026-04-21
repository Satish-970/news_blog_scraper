import { eq, desc, and, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, articles, scrapeLogs, rawNews, Article, Category, ScrapeLog, RawNews } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CATEGORY HELPERS ============

export async function getOrCreateCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const categoryNames = ["Stocks", "Technology", "Space"];
  const results: Category[] = [];

  for (const name of categoryNames) {
    const slug = name.toLowerCase();
    const existing = await db.select().from(categories).where(eq(categories.name, name)).limit(1);

    if (existing.length > 0) {
      results.push(existing[0]);
    } else {
      const inserted = await db.insert(categories).values({
        name,
        slug,
        description: `Latest news and updates about ${name}`,
      });
      const newCat = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
      if (newCat.length > 0) results.push(newCat[0]);
    }
  }

  return results;
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllCategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(categories);
}

// ============ ARTICLE HELPERS ============

export async function createArticle(data: {
  categoryId: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  sourceUrl?: string;
  imageUrl?: string;
  published?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(articles).values({
    ...data,
    published: data.published ?? false,
  });
  
  return result;
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getArticlesByCategoryId(categoryId: number, limit = 10, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(articles)
    .where(and(eq(articles.categoryId, categoryId), eq(articles.published, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function getLatestArticles(limit = 12, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(articles)
    .where(eq(articles.published, true))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function searchArticles(query: string, limit = 10, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.published, true),
        like(articles.title, `%${query}%`)
      )
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function publishArticle(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(articles)
    .set({ published: true, publishedAt: new Date() })
    .where(eq(articles.id, articleId));
}

export async function unpublishArticle(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(articles)
    .set({ published: false })
    .where(eq(articles.id, articleId));
}

export async function deleteArticle(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(articles).where(eq(articles.id, articleId));
}

// ============ SCRAPE LOG HELPERS ============

export async function createScrapeLog(categoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scrapeLogs).values({
    categoryId,
    status: "running",
  });
  return result;
}

export async function updateScrapeLog(logId: number, data: {
  status?: "pending" | "running" | "completed" | "failed";
  articlesScraped?: number;
  articlesGenerated?: number;
  articlesPublished?: number;
  errorMessage?: string;
  completedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(scrapeLogs).set(data).where(eq(scrapeLogs.id, logId));
}

export async function getScrapeLogById(logId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(scrapeLogs).where(eq(scrapeLogs.id, logId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getScrapeLogs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(scrapeLogs)
    .orderBy(desc(scrapeLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getScrapeLogsByCategory(categoryId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(scrapeLogs)
    .where(eq(scrapeLogs.categoryId, categoryId))
    .orderBy(desc(scrapeLogs.createdAt))
    .limit(limit);
}

// ============ RAW NEWS HELPERS ============

export async function createRawNews(data: {
  categoryId: number;
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const result = await db.insert(rawNews).values(data);
    return result;
  } catch (error: any) {
    // Ignore duplicate URL errors
    if (error.code === "ER_DUP_ENTRY") {
      return null;
    }
    throw error;
  }
}

export async function getUnprocessedNews(categoryId?: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [eq(rawNews.processed, false)];
  if (categoryId) conditions.push(eq(rawNews.categoryId, categoryId));
  
  return db
    .select()
    .from(rawNews)
    .where(and(...conditions))
    .orderBy(desc(rawNews.createdAt))
    .limit(limit);
}

export async function markNewsAsProcessed(newsId: number, articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .update(rawNews)
    .set({ processed: true, articleId })
    .where(eq(rawNews.id, newsId));
}
