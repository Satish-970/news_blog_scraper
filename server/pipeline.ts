import { scrapeNews } from "./scraper";
import { generateBlogPost, generateSlug } from "./blogGenerator";
import {
  createScrapeLog,
  updateScrapeLog,
  createRawNews,
  getUnprocessedNews,
  markNewsAsProcessed,
  createArticle,
  publishArticle,
  getCategoryBySlug,
  getAllCategories,
} from "./db";

/**
 * Main pipeline: scrape news → generate blog posts → publish
 */
export async function runScrapeAndPublishPipeline(categorySlug?: string) {
  try {
    // Get categories to process
    let categoriesToProcess = [];
    if (categorySlug) {
      const cat = await getCategoryBySlug(categorySlug);
      if (cat) categoriesToProcess.push(cat);
    } else {
      categoriesToProcess = await getAllCategories();
    }

    console.log(`[Pipeline] Starting pipeline for ${categoriesToProcess.length} categories`);

    for (const category of categoriesToProcess) {
      await processCategoryPipeline(category.id, category.slug);
    }

    console.log("[Pipeline] Pipeline completed successfully");
  } catch (error) {
    console.error("[Pipeline] Fatal error in pipeline:", error);
    throw error;
  }
}

/**
 * Process a single category through the entire pipeline
 */
async function processCategoryPipeline(categoryId: number, categorySlug: string) {
  console.log(`[Pipeline] Processing category: ${categorySlug}`);

  // Create scrape log entry
  const logResult = await createScrapeLog(categoryId);
  const logId = (logResult as any).insertId || 0;

  try {
    // Step 1: Scrape news
    console.log(`[Pipeline] Step 1: Scraping news for ${categorySlug}`);
    const scrapedNews = await scrapeNews(categorySlug);

    if (scrapedNews.length === 0) {
      console.warn(`[Pipeline] No news found for ${categorySlug}`);
      await updateScrapeLog(logId, {
        status: "completed",
        articlesScraped: 0,
        completedAt: new Date(),
      });
      return;
    }

    // Store raw news
    let storedCount = 0;
    for (const news of scrapedNews) {
      const result = await createRawNews({
        categoryId,
        title: news.title,
        description: news.description,
        url: news.url,
        imageUrl: news.imageUrl,
        source: news.source,
        publishedAt: news.publishedAt,
      });
      if (result) storedCount++;
    }

    await updateScrapeLog(logId, { articlesScraped: storedCount });
    console.log(`[Pipeline] Stored ${storedCount} raw news items`);

    // Step 2: Generate blog posts from unprocessed news
    console.log(`[Pipeline] Step 2: Generating blog posts`);
    const unprocessedNews = await getUnprocessedNews(categoryId, 10);

    let generatedCount = 0;
    let publishedCount = 0;

    for (const newsItem of unprocessedNews) {
      try {
        // Generate blog post
        const blogPost = await generateBlogPost(
          newsItem.title,
          newsItem.description || "",
          categorySlug
        );

        if (!blogPost) {
          console.warn(`[Pipeline] Failed to generate blog post for: ${newsItem.title}`);
          continue;
        }

        // Create article in database
        const slug = generateSlug(blogPost.title);
        const articleResult = await createArticle({
          categoryId,
          title: blogPost.title,
          slug,
          summary: blogPost.summary,
          content: blogPost.content,
          sourceUrl: newsItem.url || undefined,
          imageUrl: newsItem.imageUrl || undefined,
          published: true,
        });

        const articleId = (articleResult as any).insertId || 0;

        // Publish immediately
        if (articleId) {
          await publishArticle(articleId);
          await markNewsAsProcessed(newsItem.id, articleId);
          generatedCount++;
          publishedCount++;
        }

        // Small delay between generations to be respectful to API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `[Pipeline] Error processing news item ${newsItem.id}:`,
          error
        );
      }
    }

    // Step 3: Update scrape log with final counts
    await updateScrapeLog(logId, {
      status: "completed",
      articlesGenerated: generatedCount,
      articlesPublished: publishedCount,
      completedAt: new Date(),
    });

    console.log(
      `[Pipeline] Category ${categorySlug} complete: ${generatedCount} generated, ${publishedCount} published`
    );
  } catch (error) {
    console.error(`[Pipeline] Error processing category ${categorySlug}:`, error);
    await updateScrapeLog(logId, {
      status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date(),
    });
    throw error;
  }
}
