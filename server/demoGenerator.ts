/**
 * Demo generator that creates sample blog articles from demo news
 * This allows testing the full pipeline without external APIs
 */

import { getDemoArticles } from "./demoScraper";
import {
  getOrCreateCategories,
  createRawNews,
  getUnprocessedNews,
  markNewsAsProcessed,
  createArticle,
  publishArticle,
  getCategoryBySlug,
} from "./db";
import { generateBlogPost, generateSlug } from "./blogGenerator";

/**
 * Generate demo articles for a specific category
 */
export async function generateDemoArticles(categorySlug: string) {
  console.log(`[DemoGenerator] Generating demo articles for ${categorySlug}...`);

  try {
    // Get or create categories
    const categories = await getOrCreateCategories();
    const category = categories.find((c) => c.slug === categorySlug);

    if (!category) {
      throw new Error(`Category ${categorySlug} not found`);
    }

    // Get demo articles for this category
    const demoArticles = getDemoArticles(categorySlug);
    console.log(`[DemoGenerator] Found ${demoArticles.length} demo articles for ${categorySlug}`);

    if (demoArticles.length === 0) {
      throw new Error(`No demo articles available for ${categorySlug}`);
    }

    // Store raw news items
    let storedCount = 0;
    for (const news of demoArticles) {
      const result = await createRawNews({
        categoryId: category.id,
        title: news.title,
        description: news.description,
        url: news.url,
        imageUrl: news.imageUrl,
        source: news.source,
        publishedAt: news.publishedAt,
      });
      if (result) storedCount++;
    }

    console.log(`[DemoGenerator] Stored ${storedCount} raw news items`);

    // Generate blog posts from unprocessed news
    const unprocessedNews = await getUnprocessedNews(category.id, 10);
    console.log(`[DemoGenerator] Found ${unprocessedNews.length} unprocessed news items`);

    let generatedCount = 0;
    let publishedCount = 0;

    for (const newsItem of unprocessedNews) {
      try {
        console.log(`[DemoGenerator] Generating blog post: "${newsItem.title.substring(0, 50)}..."`);

        // Generate blog post using AI
        const blogPost = await generateBlogPost(
          newsItem.title,
          newsItem.description || "",
          categorySlug
        );

        if (!blogPost) {
          console.warn(`[DemoGenerator] Failed to generate blog post for ${newsItem.title}`);
          continue;
        }

        generatedCount++;

        // Create article
        const slug = generateSlug(blogPost.title);
        const articleResult = await createArticle({
          categoryId: category.id,
          title: blogPost.title,
          slug,
          summary: blogPost.summary,
          content: blogPost.content,
          sourceUrl: newsItem.url || undefined,
          imageUrl: newsItem.imageUrl || undefined,
          published: true,
        });

        const articleId = (articleResult as any).insertId;
        if (articleId) {
          await publishArticle(articleId);
          await markNewsAsProcessed(newsItem.id, articleId);
          publishedCount++;
          console.log(`[DemoGenerator] ✅ Published: ${blogPost.title.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error(
          `[DemoGenerator] Error generating blog post:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    console.log(
      `[DemoGenerator] Generated ${generatedCount} and published ${publishedCount} articles`
    );

    return {
      success: true,
      category: categorySlug,
      articlesGenerated: generatedCount,
      articlesPublished: publishedCount,
    };
  } catch (error) {
    console.error(
      `[DemoGenerator] Error generating demo articles:`,
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

/**
 * Generate demo articles for all categories
 */
export async function generateAllDemoArticles() {
  console.log("[DemoGenerator] Generating demo articles for all categories...");

  const categories = ["stocks", "technology", "space"];
  const results = [];

  for (const category of categories) {
    try {
      const result = await generateDemoArticles(category);
      results.push(result);
    } catch (error) {
      console.error(`[DemoGenerator] Error for ${category}:`, error);
      results.push({
        success: false,
        category,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
