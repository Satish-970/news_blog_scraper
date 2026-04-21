import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateBlogPost, generateSlug, generateBlogPostsBatch } from "./blogGenerator";
import { invokeLLM } from "./_core/llm";

// Mock the LLM
vi.mock("./_core/llm");
const mockedInvokeLLM = invokeLLM as any;

describe("Blog Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSlug", () => {
    it("should convert title to URL-friendly slug", () => {
      expect(generateSlug("Hello World")).toBe("hello-world");
      expect(generateSlug("Stock Market Rises Today!")).toBe(
        "stock-market-rises-today"
      );
      expect(generateSlug("AI & Machine Learning")).toBe("ai-machine-learning");
    });

    it("should remove special characters", () => {
      expect(generateSlug("Breaking: Tech News!@#$%")).toBe("breaking-tech-news");
    });

    it("should handle multiple spaces", () => {
      expect(generateSlug("Multiple   Spaces   Here")).toBe(
        "multiple-spaces-here"
      );
    });

    it("should truncate long titles", () => {
      const longTitle = "A".repeat(150);
      const slug = generateSlug(longTitle);
      expect(slug.length).toBeLessThanOrEqual(100);
    });

    it("should handle empty strings", () => {
      expect(generateSlug("")).toBe("");
    });
  });

  describe("generateBlogPost", () => {
    it("should generate a blog post from news", async () => {
      mockedInvokeLLM.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Stock Market Surge",
                summary: "Markets reached new highs today.",
                content: "Full article content about market surge...",
              }),
            },
          },
        ],
      });

      const result = await generateBlogPost(
        "Stock Market Rises",
        "Markets up 2% today",
        "stocks"
      );

      expect(result).toMatchObject({
        title: "Stock Market Surge",
        summary: "Markets reached new highs today.",
        content: expect.stringContaining("market surge"),
      });
    });

    it("should return null on LLM error", async () => {
      mockedInvokeLLM.mockRejectedValueOnce(new Error("LLM Error"));

      const result = await generateBlogPost(
        "Test Article",
        "Test description",
        "technology"
      );

      expect(result).toBeNull();
    });

    it("should return null when LLM response is empty", async () => {
      mockedInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const result = await generateBlogPost(
        "Test Article",
        "Test description",
        "technology"
      );

      expect(result).toBeNull();
    });

    it("should handle JSON parsing errors", async () => {
      mockedInvokeLLM.mockResolvedValueOnce({
        choices: [{ message: { content: "Invalid JSON" } }],
      });

      const result = await generateBlogPost(
        "Test Article",
        "Test description",
        "technology"
      );

      expect(result).toBeNull();
    });

    it("should pass correct category to LLM", async () => {
      mockedInvokeLLM.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Test",
                summary: "Test",
                content: "Test",
              }),
            },
          },
        ],
      });

      await generateBlogPost("Title", "Desc", "space");

      expect(mockedInvokeLLM).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("space"),
            }),
          ]),
        })
      );
    });
  });

  describe("generateBlogPostsBatch", () => {
    it("should generate multiple blog posts", async () => {
      mockedInvokeLLM.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Generated Article",
                summary: "Summary",
                content: "Content",
              }),
            },
          },
        ],
      });

      const newsItems = [
        { title: "News 1", description: "Desc 1" },
        { title: "News 2", description: "Desc 2" },
        { title: "News 3", description: "Desc 3" },
      ];

      const results = await generateBlogPostsBatch(newsItems, "technology");

      expect(results).toHaveLength(3);
      expect(mockedInvokeLLM).toHaveBeenCalledTimes(3);
    });

    it("should handle partial failures", async () => {
      mockedInvokeLLM
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Article 1",
                  summary: "Summary",
                  content: "Content",
                }),
              },
            },
          ],
        })
        .mockRejectedValueOnce(new Error("Error"))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Article 3",
                  summary: "Summary",
                  content: "Content",
                }),
              },
            },
          ],
        });

      const newsItems = [
        { title: "News 1", description: "Desc 1" },
        { title: "News 2", description: "Desc 2" },
        { title: "News 3", description: "Desc 3" },
      ];

      const results = await generateBlogPostsBatch(newsItems, "stocks", 1);

      expect(results).toHaveLength(2);
    });

    it("should respect maxConcurrent parameter", async () => {
      mockedInvokeLLM.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "Article",
                summary: "Summary",
                content: "Content",
              }),
            },
          },
        ],
      });

      const newsItems = Array.from({ length: 5 }, (_, i) => ({
        title: `News ${i}`,
        description: `Desc ${i}`,
      }));

      await generateBlogPostsBatch(newsItems, "technology", 2);

      // Should be called 5 times total
      expect(mockedInvokeLLM).toHaveBeenCalledTimes(5);
    });
  });
});
