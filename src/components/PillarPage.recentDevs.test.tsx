import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// --- Mocks ---------------------------------------------------------------

const MOCK_ARTICLES = [
  {
    id: "a1",
    title: "First development with URL",
    summary: "Summary one",
    url: "https://example.com/one",
    source_name: "Reg Source",
    published_at: "2026-01-15T00:00:00Z",
    ai_summary: { why_it_matters: "It matters one.", urgency: "immediate" },
  },
  {
    id: "a2",
    title: "Second development with URL",
    summary: "Summary two",
    url: "https://example.com/two",
    source_name: "Reg Source",
    published_at: "2026-01-14T00:00:00Z",
    ai_summary: { why_it_matters: "It matters two.", urgency: "this-quarter" },
  },
  {
    id: "a3",
    title: "Third development with URL",
    summary: "Summary three",
    url: "https://example.com/three",
    source_name: "Reg Source",
    published_at: "2026-01-13T00:00:00Z",
    ai_summary: { why_it_matters: "It matters three.", urgency: "monitor" },
  },
  {
    id: "a4",
    title: "Fourth development without URL",
    summary: "Summary four",
    url: null,
    source_name: "Reg Source",
    published_at: "2026-01-12T00:00:00Z",
    ai_summary: null,
  },
];

vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve({ data: MOCK_ARTICLES, error: null })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return {
    supabase: {
      from: vi.fn(() => builder),
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      },
    },
  };
});

const mockAuth = vi.fn();
const mockPremium = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuth(),
}));
vi.mock("@/hooks/usePremiumStatus", () => ({
  usePremiumStatus: () => mockPremium(),
}));

// Stub heavy presentational components we don't need to test here.
vi.mock("@/components/Navbar", () => ({ default: () => <nav data-testid="navbar" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer data-testid="footer" /> }));
vi.mock("@/components/AdBanner", () => ({ default: () => <div data-testid="ad" /> }));

import PillarPage from "@/components/PillarPage";

const baseProps = {
  title: "U.S. State Privacy Laws",
  subtitle: "Sub",
  icon: "🗺️",
  lastUpdated: "Jan 2026",
  intro: "Intro",
  sections: [{ heading: "H", content: "C" }],
  relatedLinks: [{ label: "L", href: "/x" }],
  updateCategory: "us-states",
};

function renderPillar() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PillarPage {...baseProps} />
      </MemoryRouter>
    </HelmetProvider>
  );
}

async function getRecentLinks() {
  // Wait for the heading then collect title links by their href.
  await screen.findByText(/Recent developments/i);
  await waitFor(() => {
    expect(screen.getAllByText(/development with URL/).length).toBeGreaterThan(0);
  });
  return MOCK_ARTICLES.filter((a) => a.url).map((a) => ({
    article: a,
    el: screen.queryByRole("link", { name: new RegExp(a.title) }),
  }));
}

function assertLinkAndIcon(linkEl: HTMLElement | null, url: string) {
  expect(linkEl).not.toBeNull();
  expect(linkEl).toHaveAttribute("href", url);
  expect(linkEl).toHaveAttribute("target", "_blank");
  expect(linkEl).toHaveAttribute("rel", expect.stringContaining("noopener"));
  // ExternalLink (lucide) renders an <svg class="lucide-external-link" ...>
  const icon = linkEl!.querySelector("svg");
  expect(icon).not.toBeNull();
}

describe("PillarPage — Recent Developments title links across tiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("anonymous tier: top 3 titles render as external links with icons", async () => {
    mockAuth.mockReturnValue({ user: null, session: null, loading: false });
    mockPremium.mockReturnValue({ user: null, isPremium: false, isLoading: false });

    renderPillar();
    const links = await getRecentLinks();

    // Anonymous shows top 3
    const visible = links.slice(0, 3);
    visible.forEach(({ el, article }) => assertLinkAndIcon(el, article.url!));

    // 4th article (no URL) should NOT be a link, but anonymous tier only renders 3 anyway.
    expect(screen.queryByRole("link", { name: /Fourth development/ })).toBeNull();
  });

  it("free registered tier: titles render as external links with icons", async () => {
    const fakeUser = { id: "u1" } as any;
    mockAuth.mockReturnValue({ user: fakeUser, session: {}, loading: false });
    mockPremium.mockReturnValue({ user: fakeUser, isPremium: false, isLoading: false });

    renderPillar();
    const links = await getRecentLinks();

    // Free shows top 6 — all our URL-bearing fixtures are visible.
    links.forEach(({ el, article }) => assertLinkAndIcon(el, article.url!));

    // Article without URL renders as plain text, not a link.
    expect(screen.getByText("Fourth development without URL").tagName).not.toBe("A");
  });

  it("premium tier: all titles render as external links with icons", async () => {
    const fakeUser = { id: "u1" } as any;
    mockAuth.mockReturnValue({ user: fakeUser, session: {}, loading: false });
    mockPremium.mockReturnValue({ user: fakeUser, isPremium: true, isLoading: false });

    renderPillar();
    const links = await getRecentLinks();

    links.forEach(({ el, article }) => assertLinkAndIcon(el, article.url!));
  });
});

describe("PillarPage — covers all Laws and Frameworks pillar pages", () => {
  // All 8 pillar pages share PillarPage; exercising it per representative
  // updateCategory ensures the recent-developments rendering path is covered
  // for every route.
  const pillarConfigs = [
    { title: "U.S. State Privacy Laws", updateCategory: "us-states" },
    { title: "U.S. Federal Privacy Law", updateCategory: "us-federal" },
    { title: "Global Privacy Laws", updateCategory: "global" },
    { title: "AI Privacy Regulations", updateCategory: "ai-privacy" },
    { title: "Health Data Privacy", updateCategory: "health" },
    { title: "Biometric Privacy", updateCategory: "biometric" },
    { title: "Breach Notification", updateCategory: "breach" },
    { title: "Cross-Border Transfers", updateCategory: "cross-border" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    const fakeUser = { id: "u1" } as any;
    mockAuth.mockReturnValue({ user: fakeUser, session: {}, loading: false });
    mockPremium.mockReturnValue({ user: fakeUser, isPremium: true, isLoading: false });
  });

  it.each(pillarConfigs)("renders external title links for $title", async ({ title, updateCategory }) => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <PillarPage {...baseProps} title={title} updateCategory={updateCategory} />
        </MemoryRouter>
      </HelmetProvider>
    );

    await screen.findByText(/Recent developments/i);
    await waitFor(() => {
      expect(screen.getAllByText(/development with URL/).length).toBeGreaterThan(0);
    });

    MOCK_ARTICLES.filter((a) => a.url).forEach((a) => {
      const el = screen.queryByRole("link", { name: new RegExp(a.title) });
      assertLinkAndIcon(el, a.url!);
    });
  });
});
