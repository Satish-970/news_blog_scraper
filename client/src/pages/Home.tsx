import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Search, TrendingUp, Zap, Rocket } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

const categoryIcons: Record<string, React.ReactNode> = {
  stocks: <TrendingUp className="w-5 h-5" />,
  technology: <Zap className="w-5 h-5" />,
  space: <Rocket className="w-5 h-5" />,
};

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } =
    trpc.blog.categories.useQuery();

  // Fetch latest articles or filtered articles
  const latestQuery = trpc.blog.latest.useQuery({ limit: 12 });
  const categoryQuery = trpc.blog.byCategory.useQuery(
    { categorySlug: selectedCategory || "", limit: 12 },
    { enabled: !!selectedCategory }
  );
  const articles = selectedCategory ? categoryQuery.data : latestQuery.data;
  const articlesLoading = selectedCategory ? categoryQuery.isLoading : latestQuery.isLoading;

  // Fetch search results
  const { data: searchResults } = trpc.blog.search.useQuery(
    { query: debouncedSearch, limit: 12 },
    { enabled: debouncedSearch.length > 0 }
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayArticles = debouncedSearch ? searchResults : articles;
  const isLoading = articlesLoading || categoriesLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Daily Insights</h1>
              <p className="text-sm text-slate-600 mt-1">
                AI-curated news from Stocks, Technology, and Space
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 border-slate-300 focus:border-slate-500 focus:ring-slate-500"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Category Filter */}
        {!debouncedSearch && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setSelectedCategory(null)}
                variant={selectedCategory === null ? "default" : "outline"}
                className={`rounded-full transition-all ${
                  selectedCategory === null
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-300 text-slate-700 hover:border-slate-400"
                }`}
              >
                All Articles
              </Button>
              {categories?.map((category) => (
                <Button
                  key={category.slug}
                  onClick={() => setSelectedCategory(category.slug)}
                  variant={selectedCategory === category.slug ? "default" : "outline"}
                  className={`rounded-full transition-all flex items-center gap-2 ${
                    selectedCategory === category.slug
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {categoryIcons[category.slug]}
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Articles Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : displayArticles && displayArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayArticles?.map((article: any) => {
              const category = categories?.find(
                (c) => c.id === article.categoryId
              );
              return (
                <Link
                  key={article.id}
                  href={`/article/${article.slug}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden border-slate-200 hover:border-slate-400 transition-all hover:shadow-lg cursor-pointer">
                    {/* Article Image */}
                    {article.imageUrl && (
                      <div className="relative h-48 overflow-hidden bg-slate-200">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      {/* Category Badge */}
                      {category && (
                        <div className="flex items-center gap-1 mb-3">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                            {categoryIcons[category.slug]}
                            {category.name}
                          </span>
                        </div>
                      )}

                      {/* Title */}
                      <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-slate-700 transition-colors">
                        {article.title}
                      </h3>

                      {/* Summary */}
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                        {article.summary}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="text-xs text-slate-500">
                          {formatDistanceToNow(new Date(article.publishedAt || article.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        {article.sourceUrl && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(article.sourceUrl, '_blank');
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title="Original source"
                          >
                            Source
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-600 text-lg">
              {debouncedSearch
                ? "No articles found matching your search."
                : "No articles available yet. Check back soon!"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
