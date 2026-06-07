import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Authority = {
  id: string;
  citation: string;
  title: string;
  authority_type: string;
  source: string;
  full_text: string;
  plain_summary: string | null;
  topics: string[];
  defines_terms: string[];
  binding: boolean;
  authority_weight: number;
  effective_date: string | null;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  official_url: string | null;
};

type Deadline = {
  id?: string;
  obligation: string;
  trigger_condition: string;
  effective_date: string | null;
  compliance_deadline: string | null;
  revenue_tier: string | null;
  topics: string[];
  primary_authority_citation: string;
  supporting_citations: string[] | null;
  notes: string | null;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
};

type Settings = {
  verified_only_mode: boolean;
  corpus_marked_complete: boolean;
};

async function callAdmin(action: string, opts: { method?: "GET" | "POST"; body?: any; query?: Record<string, string> } = {}) {
  const params = new URLSearchParams({ action, ...(opts.query ?? {}) });
  const { data, error } = await supabase.functions.invoke(
    `cppa-corpus-admin?${params.toString()}`,
    { method: opts.method ?? "POST", body: opts.body ?? {} },
  );
  if (error) throw error;
  return data;
}

export default function CPPACorpusAdmin() {
  const [tab, setTab] = useState("authorities");
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const r = await callAdmin("get_settings", { method: "POST" });
      setSettings(r.settings);
    } catch (e: any) { toast.error(e.message); }
  }, []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  return (
    <>
      <Helmet><title>CPPA Corpus Admin</title></Helmet>
      <Navbar />
      <main className="container mx-auto py-8 max-w-7xl">
        <h1 className="font-display text-3xl mb-2">CPPA Corpus Admin</h1>
        <p className="text-muted-foreground mb-6">
          Trust boundary: verify and curate the legal-reference corpus that powers CPPA tools.
        </p>

        {settings && (
          <div className="flex flex-wrap gap-6 p-4 rounded-md border bg-muted/30 mb-6">
            <div className="flex items-center gap-2">
              <Switch
                id="verified-only"
                checked={settings.verified_only_mode}
                onCheckedChange={async (v) => {
                  const r = await callAdmin("update_settings", { body: { verified_only_mode: v } });
                  setSettings(r.settings);
                  toast.success("Updated");
                }}
              />
              <Label htmlFor="verified-only">Verified-only retrieval</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="complete"
                checked={settings.corpus_marked_complete}
                onCheckedChange={async (v) => {
                  const r = await callAdmin("update_settings", { body: { corpus_marked_complete: v } });
                  setSettings(r.settings);
                  toast.success("Updated");
                }}
              />
              <Label htmlFor="complete">Corpus marked complete</Label>
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="authorities">Authorities</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
            <TabsTrigger value="log">Ingestion log</TabsTrigger>
          </TabsList>
          <TabsContent value="authorities"><AuthoritiesTab /></TabsContent>
          <TabsContent value="deadlines"><DeadlinesTab /></TabsContent>
          <TabsContent value="log"><LogTab /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
}

function AuthoritiesTab() {
  const [rows, setRows] = useState<Authority[]>([]);
  const [counts, setCounts] = useState<{ total: number; verified: number } | null>(null);
  const [status, setStatus] = useState("current");
  const [verified, setVerified] = useState(""); // "", "true", "false"
  const [authType, setAuthType] = useState("");
  const [topic, setTopic] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = {};
      if (status) query.status = status;
      if (verified) query.verified = verified;
      if (authType) query.authority_type = authType;
      if (topic) query.topic = topic;
      const r = await callAdmin("list_authorities", { method: "POST", query });
      setRows(r.rows ?? []);
      setCounts(r.counts);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [status, verified, authType, topic]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4 pt-4">
      <IngestForm onIngested={load} />

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <Label className="text-xs">Status</Label>
          <select className="block border rounded px-2 py-1 bg-background"
            value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">all</option>
            <option value="current">current</option>
            <option value="superseded">superseded</option>
            <option value="quarantined">quarantined</option>
            <option value="draft">draft</option>
            <option value="proposed">proposed</option>
            <option value="repealed">repealed</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Verified</Label>
          <select className="block border rounded px-2 py-1 bg-background"
            value={verified} onChange={(e) => setVerified(e.target.value)}>
            <option value="">any</option>
            <option value="true">verified</option>
            <option value="false">unverified</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <select className="block border rounded px-2 py-1 bg-background"
            value={authType} onChange={(e) => setAuthType(e.target.value)}>
            <option value="">any</option>
            <option value="statute">statute</option>
            <option value="regulation">regulation</option>
            <option value="guidance">guidance</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Topic</Label>
          <Input className="w-48" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. admt" />
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
        {counts && (
          <div className="text-sm text-muted-foreground ml-auto">
            {counts.verified} verified / {counts.total} current
          </div>
        )}
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-2">Citation</th>
              <th className="p-2">Title</th>
              <th className="p-2">Type</th>
              <th className="p-2">Topics</th>
              <th className="p-2">Effective</th>
              <th className="p-2">Status</th>
              <th className="p-2">Verified</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <AuthorityRow
                key={r.id}
                row={r}
                expanded={expanded === r.id}
                onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                onUpdated={load}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuthorityRow({ row, expanded, onToggle, onUpdated }: {
  row: Authority; expanded: boolean; onToggle: () => void; onUpdated: () => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [summary, setSummary] = useState(row.plain_summary ?? "");
  const [topicsStr, setTopicsStr] = useState(row.topics.join(", "));

  const save = async () => {
    try {
      await callAdmin("update_authority", { body: {
        id: row.id, title, plain_summary: summary,
        topics: topicsStr.split(",").map(s => s.trim()).filter(Boolean),
      }});
      toast.success("Saved");
      onUpdated();
    } catch (e: any) { toast.error(e.message); }
  };
  const verify = async () => {
    try { await callAdmin("verify_authority", { body: { id: row.id } }); toast.success("Verified"); onUpdated(); }
    catch (e: any) { toast.error(e.message); }
  };
  const quarantine = async () => {
    if (!confirm("Quarantine this section? Retrieval will exclude it.")) return;
    try { await callAdmin("quarantine_authority", { body: { id: row.id } }); toast.success("Quarantined"); onUpdated(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <tr className="border-t cursor-pointer hover:bg-muted/20" onClick={onToggle}>
        <td className="p-2 font-mono text-xs">{row.citation}</td>
        <td className="p-2">{row.title}</td>
        <td className="p-2">{row.authority_type}</td>
        <td className="p-2"><div className="flex flex-wrap gap-1">{row.topics.slice(0, 4).map(t => (
          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
        ))}{row.topics.length > 4 && <span className="text-xs text-muted-foreground">+{row.topics.length - 4}</span>}</div></td>
        <td className="p-2">{row.effective_date ?? "—"}</td>
        <td className="p-2">{row.status}</td>
        <td className="p-2">{row.verified_by ? "✓" : "—"}</td>
        <td className="p-2 text-right">{expanded ? "▾" : "▸"}</td>
      </tr>
      {expanded && (
        <tr className="border-t bg-muted/10">
          <td colSpan={8} className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Full text (read-only)</Label>
                <pre className="border rounded p-2 max-h-96 overflow-auto text-xs whitespace-pre-wrap bg-background">{row.full_text}</pre>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Plain summary</Label>
                  <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} />
                </div>
                <div>
                  <Label className="text-xs">Topics (comma-separated)</Label>
                  <Input value={topicsStr} onChange={(e) => setTopicsStr(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={save}>Save edits</Button>
                  <Button size="sm" variant="secondary" onClick={verify}>Mark verified</Button>
                  <Button size="sm" variant="destructive" onClick={quarantine}>Quarantine</Button>
                </div>
                {row.official_url && (
                  <a href={row.official_url} target="_blank" rel="noreferrer"
                    className="text-xs text-brand-teal underline">Open source</a>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DeadlinesTab() {
  const [rows, setRows] = useState<Deadline[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [editing, setEditing] = useState<Deadline | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await callAdmin("list_deadlines");
      setRows(r.rows ?? []);
      setSuggestions(r.suggestions ?? []);
    } catch (e: any) { toast.error(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const blank: Deadline = {
    obligation: "", trigger_condition: "", effective_date: null,
    compliance_deadline: null, revenue_tier: null, topics: [],
    primary_authority_citation: "", supporting_citations: null, notes: null,
    status: "current", verified_by: null, verified_at: null,
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex justify-between items-center">
        <h2 className="font-medium">Verified deadlines</h2>
        <Button onClick={() => setEditing(blank)}>+ New deadline</Button>
      </div>
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr>
            <th className="p-2">Obligation</th><th className="p-2">Trigger</th>
            <th className="p-2">Effective</th><th className="p-2">Deadline</th>
            <th className="p-2">Tier</th><th className="p-2">Cite</th>
            <th className="p-2">Verified</th><th className="p-2"></th>
          </tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.obligation}</td>
              <td className="p-2 text-xs">{r.trigger_condition}</td>
              <td className="p-2">{r.effective_date ?? "—"}</td>
              <td className="p-2">{r.compliance_deadline ?? "—"}</td>
              <td className="p-2">{r.revenue_tier ?? "—"}</td>
              <td className="p-2 font-mono text-xs">{r.primary_authority_citation}</td>
              <td className="p-2">{r.verified_by ? "✓" : "—"}</td>
              <td className="p-2 text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
                {!r.verified_by && (
                  <Button size="sm" variant="ghost" onClick={async () => {
                    await callAdmin("verify_deadline", { body: { id: r.id } });
                    toast.success("Verified"); load();
                  }}>Verify</Button>
                )}
                <Button size="sm" variant="ghost" onClick={async () => {
                  if (!confirm("Delete?")) return;
                  await callAdmin("delete_deadline", { body: { id: r.id } });
                  toast.success("Deleted"); load();
                }}>Delete</Button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {editing && (
        <DeadlineEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {suggestions.length > 0 && (
        <div className="border rounded p-3 bg-muted/20">
          <h3 className="font-medium text-sm mb-2">Deadline-text suggestions (from ingestion log)</h3>
          <ul className="space-y-2 text-xs">
            {suggestions.slice(0, 20).map((s, i) => (
              <li key={i} className="border-l-2 border-brand-teal pl-3">
                <div className="font-mono">{s.citation}</div>
                <div className="italic">{s.details?.deadline_text}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DeadlineEditor({ initial, onClose, onSaved }: {
  initial: Deadline; onClose: () => void; onSaved: () => void;
}) {
  const [d, setD] = useState<Deadline>(initial);
  const set = (k: keyof Deadline, v: any) => setD(prev => ({ ...prev, [k]: v }));
  const save = async () => {
    try {
      await callAdmin("upsert_deadline", { body: {
        ...d,
        topics: typeof (d.topics as any) === "string"
          ? String(d.topics).split(",").map(s => s.trim()).filter(Boolean)
          : d.topics,
      }});
      toast.success("Saved"); onSaved();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto space-y-3">
        <h3 className="font-display text-xl">{d.id ? "Edit deadline" : "New deadline"}</h3>
        <div><Label>Obligation</Label><Input value={d.obligation} onChange={(e) => set("obligation", e.target.value)} /></div>
        <div><Label>Trigger condition</Label><Textarea value={d.trigger_condition} onChange={(e) => set("trigger_condition", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Effective date</Label><Input type="date" value={d.effective_date ?? ""} onChange={(e) => set("effective_date", e.target.value || null)} /></div>
          <div><Label>Compliance deadline</Label><Input type="date" value={d.compliance_deadline ?? ""} onChange={(e) => set("compliance_deadline", e.target.value || null)} /></div>
        </div>
        <div><Label>Revenue tier</Label><Input value={d.revenue_tier ?? ""} onChange={(e) => set("revenue_tier", e.target.value || null)} /></div>
        <div><Label>Topics (comma-separated)</Label>
          <Input value={Array.isArray(d.topics) ? d.topics.join(", ") : ""}
            onChange={(e) => set("topics", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>
        <div><Label>Primary citation</Label><Input value={d.primary_authority_citation} onChange={(e) => set("primary_authority_citation", e.target.value)} /></div>
        <div><Label>Supporting citations (comma-separated)</Label>
          <Input value={(d.supporting_citations ?? []).join(", ")}
            onChange={(e) => set("supporting_citations", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} /></div>
        <div><Label>Notes</Label><Textarea value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} /></div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function LogTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    callAdmin("list_ingestion_log").then((r) => setRows(r.rows ?? [])).catch((e) => toast.error(e.message));
  }, []);
  return (
    <div className="pt-4">
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left"><tr>
            <th className="p-2">When</th><th className="p-2">Type</th><th className="p-2">Citation</th>
            <th className="p-2">+/Δ</th><th className="p-2">Changed</th><th className="p-2">Details</th>
          </tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className={`border-t ${r.change_detected ? "bg-amber-500/10" : ""}`}>
              <td className="p-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
              <td className="p-2">{r.run_type}</td>
              <td className="p-2 font-mono text-xs">{r.citation}</td>
              <td className="p-2">{r.authorities_added ?? 0}/{r.authorities_updated ?? 0}</td>
              <td className="p-2">{r.change_detected ? "yes" : ""}</td>
              <td className="p-2 text-xs"><pre className="whitespace-pre-wrap max-w-md">{JSON.stringify(r.details, null, 2)}</pre></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
