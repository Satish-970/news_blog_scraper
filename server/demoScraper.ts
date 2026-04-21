/**
 * Demo scraper that generates sample news articles for testing
 * This doesn't require external API keys and works immediately
 */

export interface DemoNews {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: Date;
}

const demoArticles: Record<string, DemoNews[]> = {
  stocks: [
    {
      title: "Tech Stocks Rally as AI Investments Surge",
      description: "Major technology companies see significant gains as investors pour billions into artificial intelligence initiatives. Market analysts predict continued growth in the sector.",
      url: "https://example.com/tech-stocks-rally",
      source: "Financial Times",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      title: "Federal Reserve Signals Potential Rate Cuts",
      description: "The Federal Reserve indicated today that interest rate cuts could be on the horizon if inflation continues to moderate. This news boosted market sentiment across all sectors.",
      url: "https://example.com/fed-rate-cuts",
      source: "Bloomberg",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      title: "Energy Sector Outperforms Market Expectations",
      description: "Oil and gas companies report stronger-than-expected earnings, driving energy stocks higher. Renewable energy companies also show strong performance.",
      url: "https://example.com/energy-sector",
      source: "Reuters",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      title: "Cryptocurrency Market Stabilizes After Volatility",
      description: "Bitcoin and Ethereum show signs of stabilization after weeks of volatility. Institutional investors increase their positions in digital assets.",
      url: "https://example.com/crypto-stable",
      source: "CoinDesk",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      title: "Consumer Stocks Gain on Strong Retail Sales Data",
      description: "Retail companies surge on better-than-expected sales figures. Consumer confidence remains robust despite economic headwinds.",
      url: "https://example.com/retail-sales",
      source: "MarketWatch",
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
  ],
  technology: [
    {
      title: "OpenAI Announces Major Breakthrough in AI Reasoning",
      description: "OpenAI revealed significant advances in AI reasoning capabilities, bringing artificial intelligence closer to human-level problem solving in complex domains.",
      url: "https://example.com/openai-breakthrough",
      source: "TechCrunch",
      publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      title: "Google Launches New Quantum Computing Chip",
      description: "Google announced a new quantum processor that doubles the capabilities of previous generations. The chip could revolutionize drug discovery and materials science.",
      url: "https://example.com/google-quantum",
      source: "The Verge",
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      title: "Apple Releases Revolutionary Vision Pro 2",
      description: "Apple's latest spatial computing device features improved display technology and AI integration. Pre-orders exceed expectations.",
      url: "https://example.com/apple-vision",
      source: "Wired",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
      title: "Microsoft Integrates Advanced AI into Office Suite",
      description: "Microsoft announced deep AI integration across Office applications, including intelligent document analysis and automated content creation.",
      url: "https://example.com/microsoft-ai",
      source: "Ars Technica",
      publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
    },
    {
      title: "Cybersecurity Threats Rise as AI-Powered Attacks Emerge",
      description: "Security researchers warn of new AI-powered cyberattacks that can adapt and evolve in real-time. Companies urged to strengthen defenses.",
      url: "https://example.com/cyber-threats",
      source: "SecurityWeek",
      publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
    },
  ],
  space: [
    {
      title: "NASA Discovers Earth-Like Exoplanet in Habitable Zone",
      description: "Astronomers using the James Webb Space Telescope discovered a potentially habitable exoplanet orbiting a nearby star. The planet shows signs of water and stable temperatures.",
      url: "https://example.com/nasa-exoplanet",
      source: "NASA",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      title: "SpaceX Successfully Lands Starship on Moon",
      description: "SpaceX achieved a historic milestone by successfully landing its Starship spacecraft on the lunar surface. The mission marks a major step toward sustainable lunar exploration.",
      url: "https://example.com/spacex-moon",
      source: "Space.com",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      title: "International Space Station Celebrates 25 Years",
      description: "The ISS marks 25 years of continuous human presence in space. Scientists reflect on groundbreaking research conducted aboard the orbiting laboratory.",
      url: "https://example.com/iss-anniversary",
      source: "ESA",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      title: "China Launches Advanced Space Telescope",
      description: "China's new space telescope begins operations, joining international efforts to map the universe. The telescope features cutting-edge infrared detection technology.",
      url: "https://example.com/china-telescope",
      source: "Xinhua",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      title: "Scientists Detect Signals from Potentially Habitable World",
      description: "Radio astronomers detected unusual signals from a distant star system. Researchers believe the signals may indicate advanced civilization or natural phenomena.",
      url: "https://example.com/space-signals",
      source: "Science Daily",
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
  ],
};

/**
 * Get demo articles for a category
 */
export function getDemoArticles(category: string): DemoNews[] {
  const key = category.toLowerCase();
  return demoArticles[key] || [];
}

/**
 * Get all demo articles
 */
export function getAllDemoArticles(): DemoNews[] {
  return Object.values(demoArticles).flat();
}
