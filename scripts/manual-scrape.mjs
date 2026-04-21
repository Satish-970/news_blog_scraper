#!/usr/bin/env node

/**
 * Manual scraper script to populate the database with articles
 * Run with: node scripts/manual-scrape.mjs
 */

import 'dotenv/config';
import { getDb, getOrCreateCategories, createRawNews, getUnprocessedNews, markNewsAsProcessed, createArticle, publishArticle } from '../server/db.ts';
import { scrapeNews } from '../server/scraper.ts';
import { generateBlogPost, generateSlug } from '../server/blogGenerator.ts';

async function main() {
  console.log('🚀 Starting manual scrape and blog generation...\n');

  try {
    // Step 1: Initialize categories
    console.log('📁 Step 1: Initializing categories...');
    const categories = await getOrCreateCategories();
    console.log(`✅ Categories initialized: ${categories.map(c => c.name).join(', ')}\n`);

    // Step 2: Scrape news for each category
    const categoryNames = ['stocks', 'technology', 'space'];
    
    for (const categorySlug of categoryNames) {
      console.log(`\n📰 Scraping ${categorySlug.toUpperCase()} news...`);
      
      try {
        const scrapedNews = await scrapeNews(categorySlug);
        console.log(`✅ Found ${scrapedNews.length} articles for ${categorySlug}`);

        if (scrapedNews.length === 0) {
          console.warn(`⚠️  No articles found for ${categorySlug}. Make sure NewsAPI key is configured.`);
          continue;
        }

        // Find the category ID
        const category = categories.find(c => c.slug === categorySlug);
        if (!category) {
          console.error(`❌ Category ${categorySlug} not found`);
          continue;
        }

        // Store raw news
        let storedCount = 0;
        for (const news of scrapedNews.slice(0, 5)) { // Limit to 5 per category for demo
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
        console.log(`✅ Stored ${storedCount} raw news items`);

        // Step 3: Generate blog posts
        console.log(`\n🤖 Generating blog posts from ${categorySlug} news...`);
        const unprocessedNews = await getUnprocessedNews(category.id, 5);
        console.log(`Found ${unprocessedNews.length} unprocessed news items`);

        let generatedCount = 0;
        for (const newsItem of unprocessedNews) {
          try {
            console.log(`  Generating: "${newsItem.title.substring(0, 50)}..."`);
            
            const blogPost = await generateBlogPost(
              newsItem.title,
              newsItem.description || '',
              categorySlug
            );

            if (!blogPost) {
              console.warn(`  ⚠️  Failed to generate blog post`);
              continue;
            }

            // Create article
            const slug = generateSlug(blogPost.title);
            const articleResult = await createArticle({
              categoryId: category.id,
              title: blogPost.title,
              slug,
              summary: blogPost.summary,
              content: blogPost.content,
              sourceUrl: newsItem.url,
              imageUrl: newsItem.imageUrl,
              published: true,
            });

            const articleId = (articleResult as any).insertId;
            if (articleId) {
              await publishArticle(articleId);
              await markNewsAsProcessed(newsItem.id, articleId);
              generatedCount++;
              console.log(`  ✅ Published: ${blogPost.title.substring(0, 50)}...`);
            }
          } catch (error) {
            console.error(`  ❌ Error generating blog post:`, error instanceof Error ? error.message : error);
          }
        }

        console.log(`✅ Generated and published ${generatedCount} blog posts for ${categorySlug}\n`);
      } catch (error) {
        console.error(`❌ Error processing ${categorySlug}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log('\n✨ Manual scrape and generation completed!');
    console.log('📍 Check your blog at: http://localhost:3000');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
