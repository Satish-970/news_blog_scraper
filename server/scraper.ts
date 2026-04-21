import axios from "axios";
import { parseStringPromise } from "xml2js";

export interface ScrapedNews {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt?: Date;
}

/**
 * Scrapes news from NewsAPI.org with retry logic
 * Requires NEWSAPI_KEY environment variable
 */
export async function scrapeNewsAPI(category: string): Promise<ScrapedNews[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) {
    console.warn("[Scraper] NewsAPI key not configured, skipping NewsAPI source");
    return [];
  }

  return scrapeNewsAPIWithRetry(category, apiKey, 3);
}

/**
 * Internal function to scrape NewsAPI with retry logic
 */
async function scrapeNewsAPIWithRetry(
  category: string,
  apiKey: string,
  maxRetries = 3
): Promise<ScrapedNews[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const searchTerms: Record<string, string> = {
        stocks: "stock market stocks finance",
        technology: "technology tech AI artificial intelligence",
        space: "space NASA astronomy SpaceX",
      };

      const searchTerm = searchTerms[category.toLowerCase()] || category;

      console.log(
        `[Scraper] Fetching NewsAPI for "${searchTerm}" (attempt ${attempt}/${maxRetries})`
      );

      const response = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: searchTerm,
          sortBy: "publishedAt",
          language: "en",
          pageSize: 20,
          apiKey,
        },
        timeout: 10000,
      });

      if (response.data.articles) {
        return response.data.articles.map((article: any) => ({
          title: article.title,
          description: article.description || article.content || "",
          url: article.url,
          imageUrl: article.urlToImage,
          source: article.source?.name || "NewsAPI",
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
        }));
      }

      return [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[Scraper] Attempt ${attempt} failed for NewsAPI ${category}:`,
        lastError.message
      );

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(
    `[Scraper] Failed to fetch NewsAPI after ${maxRetries} attempts for ${category}:`,
    lastError
  );
  return [];
}

/**
 * Scrapes news from RSS feeds with retry logic
 */
export async function scrapeRSSFeeds(category: string): Promise<ScrapedNews[]> {
  const feeds: Record<string, string[]> = {
    stocks: [
      "https://feeds.bloomberg.com/markets/news.rss",
      "https://feeds.cnbc.com/cnbc/financials",
    ],
    technology: [
      "https://feeds.arstechnica.com/arstechnica/index",
      "https://feeds.theverge.com/feed",
      "https://feeds.techcrunch.com/techcrunch/",
    ],
    space: [
      "https://www.nasa.gov/news/news-releases/feed/",
      "https://spaceflightnow.com/feed/",
    ],
  };

  const categoryFeeds = feeds[category.toLowerCase()] || [];
  const results: ScrapedNews[] = [];

  for (const feedUrl of categoryFeeds) {
    const rssItems = await parseRSSFeedWithRetry(feedUrl, 3);
    results.push(...rssItems);
  }

  return results;
}

/**
 * Parse a single RSS feed with retry logic
 */
async function parseRSSFeedWithRetry(
  feedUrl: string,
  maxRetries = 3
): Promise<ScrapedNews[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Scraper] Fetching RSS feed (attempt ${attempt}/${maxRetries}): ${feedUrl}`
      );
      const response = await axios.get(feedUrl, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const parsed = await parseStringPromise(response.data);
      const items = parsed.rss?.channel?.[0]?.item || [];

      return items.map((item: any) => ({
        title: item.title?.[0] || "Untitled",
        description: item.description?.[0] || item.summary?.[0] || "",
        url: item.link?.[0] || "",
        imageUrl: extractImageFromRSS(item),
        source: extractSourceFromURL(feedUrl),
        publishedAt: item.pubDate ? new Date(item.pubDate[0]) : undefined,
      }));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[Scraper] Attempt ${attempt} failed for ${feedUrl}:`,
        lastError.message
      );

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(
    `[Scraper] Failed to parse RSS feed after ${maxRetries} attempts: ${feedUrl}`,
    lastError
  );
  return [];
}

/**
 * Extract image URL from RSS item
 */
function extractImageFromRSS(item: any): string | undefined {
  if (item.image?.[0]?.url?.[0]) return item.image[0].url[0];
  if (item.enclosure?.[0]?.$ && item.enclosure[0].$.url) return item.enclosure[0].$.url;
  if (item["media:content"]?.[0]?.$ && item["media:content"][0].$.url)
    return item["media:content"][0].$.url;
  return undefined;
}

/**
 * Extract source name from feed URL
 */
function extractSourceFromURL(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace("www.", "").split(".")[0].toUpperCase();
  } catch {
    return "RSS Feed";
  }
}

/**
 * Main scraper function that combines multiple sources
 */
export async function scrapeNews(category: string): Promise<ScrapedNews[]> {
  console.log(`[Scraper] Starting news scrape for category: ${category}`);

  const newsFromAPI = await scrapeNewsAPI(category);
  const newsFromRSS = await scrapeRSSFeeds(category);

  const allNews = [...newsFromAPI, ...newsFromRSS];

  // Deduplicate by URL
  const uniqueNews = Array.from(
    new Map(allNews.map((item) => [item.url, item])).values()
  );

  console.log(`[Scraper] Scraped ${uniqueNews.length} unique articles for ${category}`);
  return uniqueNews;
}
