import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, ExternalLink, TrendingUp, Zap, Rocket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Streamdown } from "streamdown";

const categoryIcons: Record<string, React.ReactNode> = {
  stocks: <TrendingUp className="w-5 h-5" />,
  technology: <Zap className="w-5 h-5" />,
  space: <Rocket className="w-5 h-5" />,
};

export default function ArticleDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const slug = params?.slug as string;

  // Fetch article
  const { data: article, isLoading: articleLoading } = trpc.blog.article.useQuery(
    { slug },
    { enabled: !!slug }
  );

  // Fetch related articles
  const { data: relatedArticles } = trpc.blog.related.useQuery(
    {
      articleId: article?.id || 0,
      categoryId: article?.categoryId || 0,
      limit: 3,
    },
    { enabled: !!article }
  );

  // Fetch categories for metadata
  const { data: categories } = trpc.blog.categories.useQuery();

  if (articleLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-12">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Button>
          <div className="text-center py-20">
            <p className="text-slate-600 text-lg">Article not found</p>
          </div>
        </div>
      </div>
    );
  }

  const category = categories?.find((c) => c.id === article.categoryId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          {/* Hero Image */}
          {article.imageUrl && (
            <div className="mb-8 rounded-lg overflow-hidden shadow-lg">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-96 object-cover"
              />
            </div>
          )}

          {/* Article Header */}
          <div className="mb-8">
            {/* Category Badge */}
            {category && (
              <div className="flex items-center gap-1 mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium">
                  {categoryIcons[category.slug]}
                  {category.name}
                </span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 pb-6 border-b border-slate-200">
              <span>
                {formatDistanceToNow(
                  new Date(article.publishedAt || article.createdAt),
                  { addSuffix: true }
                )}
              </span>
              {article.sourceUrl && (
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Original Source
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-lg text-slate-700 font-medium">{article.summary}</p>
          </div>

          {/* Article Content */}
          <div className="prose prose-slate max-w-none mb-12">
            <Streamdown>{article.content}</Streamdown>
          </div>

          {/* Related Articles */}
          {relatedArticles && relatedArticles.length > 0 && (
            <div className="mt-16 pt-12 border-t border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Related Articles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((relatedArticle: any) => (
                  <a
                    key={relatedArticle.id}
                    href={`/article/${relatedArticle.slug}`}
                    className="group"
                  >
                    <Card className="h-full overflow-hidden border-slate-200 hover:border-slate-400 transition-all hover:shadow-lg cursor-pointer">
                      {relatedArticle.imageUrl && (
                        <div className="relative h-40 overflow-hidden bg-slate-200">
                          <img
                            src={relatedArticle.imageUrl}
                            alt={relatedArticle.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-slate-700 transition-colors">
                          {relatedArticle.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {relatedArticle.summary}
                        </p>
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
