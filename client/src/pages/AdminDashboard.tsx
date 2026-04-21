import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Play, AlertCircle, CheckCircle, Clock, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"logs" | "trigger">("logs");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Check admin access
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
          </div>
          <p className="text-slate-600">
            You need admin privileges to access this page.
          </p>
        </Card>
      </div>
    );
  }

  // Fetch categories
  const { data: categories } = trpc.blog.categories.useQuery();

  // Fetch scrape logs
  const { data: scrapeLogs, isLoading: logsLoading, refetch: refetchLogs } =
    trpc.admin.scrapeLogs.useQuery({ limit: 50 });

  // Trigger scrape mutation
  const triggerScrape = trpc.admin.triggerScrape.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Scrape pipeline triggered successfully!");
      refetchLogs();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to trigger scrape pipeline");
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "completed":
        return `${baseClass} bg-green-100 text-green-700`;
      case "running":
        return `${baseClass} bg-blue-100 text-blue-700`;
      case "failed":
        return `${baseClass} bg-red-100 text-red-700`;
      default:
        return `${baseClass} bg-slate-100 text-slate-700`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage scraping pipeline and monitor logs
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Logged in as</p>
              <p className="font-semibold text-slate-900">{user?.name || "Admin"}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setActiveTab("trigger")}
            variant={activeTab === "trigger" ? "default" : "outline"}
            className={activeTab === "trigger" ? "bg-slate-900 text-white" : ""}
          >
            <Zap className="w-4 h-4 mr-2" />
            Trigger Scrape
          </Button>
          <Button
            onClick={() => setActiveTab("logs")}
            variant={activeTab === "logs" ? "default" : "outline"}
            className={activeTab === "logs" ? "bg-slate-900 text-white" : ""}
          >
            Scrape Logs
          </Button>
        </div>

        {/* Trigger Scrape Tab */}
        {activeTab === "trigger" && (
          <Card className="p-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Manually Trigger Scrape Pipeline
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Select Category (Optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={() => setSelectedCategory(null)}
                    variant={selectedCategory === null ? "default" : "outline"}
                    className={
                      selectedCategory === null
                        ? "bg-slate-900 text-white"
                        : "border-slate-300"
                    }
                  >
                    All Categories
                  </Button>
                  {categories?.map((cat) => (
                    <Button
                      key={cat.slug}
                      onClick={() => setSelectedCategory(cat.slug)}
                      variant={selectedCategory === cat.slug ? "default" : "outline"}
                      className={
                        selectedCategory === cat.slug
                          ? "bg-slate-900 text-white"
                          : "border-slate-300"
                      }
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This will scrape news from all configured sources,
                  generate blog posts using AI, and publish them immediately.
                </p>
              </div>

              <Button
                onClick={() =>
                  triggerScrape.mutate({ categorySlug: selectedCategory || undefined })
                }
                disabled={triggerScrape.isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-lg"
              >
                {triggerScrape.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Running Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start Scrape Pipeline
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Scrape Logs Tab */}
        {activeTab === "logs" && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Scrape Logs</h2>

            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : scrapeLogs && scrapeLogs.length > 0 ? (
              <div className="space-y-4">
                {scrapeLogs.map((log: any) => {
                  const category = categories?.find((c) => c.id === log.categoryId);
                  return (
                    <Card key={log.id} className="p-6 border-slate-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(log.status)}
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {category?.name || "Unknown Category"}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </div>
                        <span className={getStatusBadge(log.status)}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-xs text-slate-600 uppercase tracking-wide">
                            Scraped
                          </p>
                          <p className="text-2xl font-bold text-slate-900">
                            {log.articlesScraped}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 uppercase tracking-wide">
                            Generated
                          </p>
                          <p className="text-2xl font-bold text-slate-900">
                            {log.articlesGenerated}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600 uppercase tracking-wide">
                            Published
                          </p>
                          <p className="text-2xl font-bold text-slate-900">
                            {log.articlesPublished}
                          </p>
                        </div>
                      </div>

                      {log.errorMessage && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Error:</strong> {log.errorMessage}
                        </div>
                      )}

                      {log.completedAt && (
                        <p className="text-xs text-slate-500">
                          Completed:{" "}
                          {new Date(log.completedAt).toLocaleString()}
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <p className="text-slate-600">No scrape logs available yet.</p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
