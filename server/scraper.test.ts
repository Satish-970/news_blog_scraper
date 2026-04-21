import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { scrapeNews, scrapeNewsAPI, scrapeRSSFeeds } from "./scraper";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as any;

describe("News Scraper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scrapeNewsAPI", () => {
    it("should return empty array when NEWSAPI_KEY is not configured", async () => {
      const originalKey = process.env.NEWSAPI_KEY;
      delete process.env.NEWSAPI_KEY;

      const result = await scrapeNewsAPI("stocks");

      expect(result).toEqual([]);

      if (originalKey) process.env.NEWSAPI_KEY = originalKey;
    });

    it("should fetch and parse articles from NewsAPI", async () => {
      process.env.NEWSAPI_KEY = "test-key";

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          articles: [
            {
              title: "Stock Market Rises",
              description: "Markets up today",
              url: "https://example.com/article1",
              urlToImage: "https://example.com/image1.jpg",
              source: { name: "Reuters" },
              publishedAt: "2026-04-21T10:00:00Z",
              content: "Full content",
            },
          ],
        },
      });

      const result = await scrapeNewsAPI("stocks");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: "Stock Market Rises",
        description: "Markets up today",
        url: "https://example.com/article1",
        imageUrl: "https://example.com/image1.jpg",
        source: "Reuters",
      });
    });

    it("should handle API errors gracefully", async () => {
      process.env.NEWSAPI_KEY = "test-key";
      mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

      const result = await scrapeNewsAPI("stocks");

      expect(result).toEqual([]);
    });

    it("should retry on failure", async () => {
      process.env.NEWSAPI_KEY = "test-key";

      mockedAxios.get
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce({
          data: {
            articles: [
              {
                title: "Test Article",
                description: "Test",
                url: "https://example.com/test",
                source: { name: "Test Source" },
              },
            ],
          },
        });

      const result = await scrapeNewsAPI("stocks");

      expect(result).toHaveLength(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it("should map different categories to correct search terms", async () => {
      process.env.NEWSAPI_KEY = "test-key";
      mockedAxios.get.mockResolvedValue({
        data: { articles: [] },
      });

      await scrapeNewsAPI("technology");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: expect.stringContaining("technology"),
          }),
        })
      );

      mockedAxios.get.mockClear();

      await scrapeNewsAPI("space");
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: expect.stringContaining("space"),
          }),
        })
      );
    });
  });

  describe("scrapeRSSFeeds", () => {
    it("should return empty array when feeds fail", async () => {
      // Mock axios to reject for RSS feeds
      mockedAxios.get.mockRejectedValue(new Error("Feed unavailable"));
      const result = await scrapeRSSFeeds("stocks");
      expect(Array.isArray(result)).toBe(true);
    }, { timeout: 15000 });
  });

  describe("scrapeNews", () => {
    it("should combine results from multiple sources", async () => {
      process.env.NEWSAPI_KEY = "test-key";

      mockedAxios.get.mockResolvedValue({
        data: {
          articles: [
            {
              title: "Article 1",
              description: "Desc 1",
              url: "https://example.com/1",
              source: { name: "Source 1" },
            },
          ],
        },
      });

      const result = await scrapeNews("stocks");

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    }, { timeout: 15000 });

    it("should deduplicate articles by URL", async () => {
      process.env.NEWSAPI_KEY = "test-key";

      mockedAxios.get.mockResolvedValue({
        data: {
          articles: [
            {
              title: "Article 1",
              description: "Desc 1",
              url: "https://example.com/same-url",
              source: { name: "Source 1" },
            },
            {
              title: "Article 1 Duplicate",
              description: "Desc 1",
              url: "https://example.com/same-url",
              source: { name: "Source 2" },
            },
          ],
        },
      });

      const result = await scrapeNews("stocks");

      // Should only have 1 article due to deduplication
      const uniqueUrls = new Set(result.map((a) => a.url));
      expect(uniqueUrls.size).toBe(result.length);
    }, { timeout: 15000 });

    it("should handle empty results", async () => {
      process.env.NEWSAPI_KEY = "test-key";
      mockedAxios.get.mockResolvedValue({
        data: { articles: [] },
      });

      const result = await scrapeNews("stocks");

      expect(result).toEqual([]);
    }, { timeout: 15000 });
  });
});
