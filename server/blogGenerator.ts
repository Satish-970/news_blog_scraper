import { invokeLLM } from "./_core/llm";

export interface GeneratedBlogPost {
  title: string;
  summary: string;
  content: string;
}

/**
 * Generates a blog post from scraped news using AI
 */
export async function generateBlogPost(
  newsTitle: string,
  newsDescription: string,
  category: string
): Promise<GeneratedBlogPost | null> {
  try {
    const systemPrompt = `You are an expert financial and technology journalist. Your task is to transform news snippets into well-written, engaging blog posts. 
    
The blog posts should be:
- Professional and informative
- Well-structured with clear sections
- Engaging and accessible to general readers
- Approximately 400-600 words for the full content
- Include relevant context and implications
- Maintain a neutral, journalistic tone`;

    const userPrompt = `Transform this news item into a blog post for the "${category}" category:

Title: ${newsTitle}
Description: ${newsDescription}

Please provide the response in the following JSON format:
{
  "title": "A compelling blog post title (different from original if needed)",
  "summary": "A 1-2 sentence summary of the article",
  "content": "The full blog post content (400-600 words)"
}

Ensure the JSON is valid and properly formatted.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "blog_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string", description: "The blog post title" },
              summary: { type: "string", description: "1-2 sentence summary" },
              content: { type: "string", description: "Full blog post content" },
            },
            required: ["title", "summary", "content"],
            additionalProperties: false,
          },
        },
      },
    });

    if (!response.choices?.[0]?.message?.content) {
      console.error("[BlogGenerator] No content in LLM response");
      return null;
    }

    const content = response.choices[0].message.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);

    return {
      title: parsed.title,
      summary: parsed.summary,
      content: parsed.content,
    };
  } catch (error) {
    console.error("[BlogGenerator] Error generating blog post:", error);
    return null;
  }
}

/**
 * Generates a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

/**
 * Batch generate blog posts from multiple news items
 */
export async function generateBlogPostsBatch(
  newsItems: Array<{ title: string; description: string }>,
  category: string,
  maxConcurrent = 3
): Promise<GeneratedBlogPost[]> {
  const results: GeneratedBlogPost[] = [];

  // Process in batches to avoid overwhelming the LLM API
  for (let i = 0; i < newsItems.length; i += maxConcurrent) {
    const batch = newsItems.slice(i, i + maxConcurrent);
    const batchPromises = batch.map((item) =>
      generateBlogPost(item.title, item.description, category)
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r) => r !== null));

    // Add delay between batches to be respectful to the API
    if (i + maxConcurrent < newsItems.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
