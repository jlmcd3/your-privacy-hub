import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ArticleRow {
  id: string;
  title: string;
  source_name: string | null;
  url: string | null;
  published_at: string;
  is_hidden: boolean;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminArticles() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Check admin or moderator role
  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"])
      .then(({ data }) => setAllowed(!!data && data.length > 0));
  }, [user]);

  const loadArticles = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from("updates")
      .select("id,title,source_name,url,published_at,is_hidden")
      .order("published_at", { ascending: false })
      .limit(100);

    if (showHiddenOnly) {
      q = q.eq("is_hidden", true);
    }
    if (search.trim()) {
      q = q.ilike("title", `%${search.trim()}%`);
    }

    const { data, error } = await q;
    if (!error && data) setArticles(data as ArticleRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!allowed) return;
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, showHiddenOnly]);

  const toggleHidden = async (article: ArticleRow) => {
    setTogglingId(article.id);
    const newValue = !article.is_hidden;
    const { data, error } = await supabase.functions.invoke(
      "admin-toggle-update-hidden",
      { body: { id: article.id, is_hidden: newValue } },
    );
    setTogglingId(null);
    if (error || (data as any)?.error) {
      alert(`Failed to update: ${error?.message || (data as any)?.error}`);
      return;
    }
    setArticles((prev) =>
      prev.map((a) =>
        a.id === article.id ? { ...a, is_hidden: newValue } : a,
      ),
    );
  };

  if (authLoading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/admin/articles" replace />;
  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="mb-2">Not authorized</h1>
          <p className="text-muted-foreground">
            You need an admin or moderator role to access this page.
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Article Moderation · Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-serif tracking-tight">
              Article Moderation
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Hide or restore articles. Hidden articles disappear from all
              public feeds, the homepage, /updates, and search.
            </p>
          </div>
          <Link
            to="/admin/ingestion"
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            ← Ingestion dashboard
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-card border border-border rounded-lg">
          <div className="relative max-w-xs w-full">
            <Input
              placeholder="Search by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadArticles()}
              className="pr-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button onClick={loadArticles} variant="secondary" size="sm">
            Search
          </Button>
          <label className="flex items-center gap-2 text-sm ml-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHiddenOnly}
              onChange={(e) => setShowHiddenOnly(e.target.checked)}
              className="h-4 w-4"
            />
            Show only hidden articles
          </label>
          <span className="ml-auto text-xs text-muted-foreground">
            Showing {articles.length} of most recent 100
          </span>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="w-[160px]">Source</TableHead>
                <TableHead className="w-[180px]">Published</TableHead>
                <TableHead className="w-[120px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    Loading articles…
                  </TableCell>
                </TableRow>
              ) : articles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                    No articles found.
                  </TableCell>
                </TableRow>
              ) : (
                articles.map((a) => (
                  <TableRow key={a.id} className={a.is_hidden ? "opacity-60" : ""}>
                    <TableCell className="max-w-xl">
                      <div className="flex items-start gap-2">
                        {a.is_hidden && (
                          <span className="inline-block px-1.5 py-0.5 text-[11px] uppercase tracking-wide rounded bg-destructive/10 text-destructive border border-destructive/30 shrink-0 mt-0.5">
                            Hidden
                          </span>
                        )}
                        {a.url ? (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline line-clamp-2"
                          >
                            {a.title}
                          </a>
                        ) : (
                          <span className="text-sm font-medium line-clamp-2">{a.title}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.source_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(a.published_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={a.is_hidden ? "secondary" : "destructive"}
                        disabled={togglingId === a.id}
                        onClick={() => toggleHidden(a)}
                      >
                        {togglingId === a.id
                          ? "…"
                          : a.is_hidden
                            ? "Unhide"
                            : "Hide"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
      <Footer />
    </div>
  );
}
