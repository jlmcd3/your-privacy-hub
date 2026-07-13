// RC-B B5 — Admin CRUD for provision_texts. Admin-only, action-logged server-side.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Row {
  key: string;
  citation: string;
  verbatim_excerpt: string;
  plain_requirements: unknown;
  jurisdiction: string | null;
  status: "pending" | "approved";
  last_verified_at: string | null;
}

export default function AdminProvisions() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"" | "pending" | "approved">("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [excerpt, setExcerpt] = useState("");
  const [plainText, setPlainText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.functions.invoke("manage-provision", { body: { action: "list", status: filter || undefined } });
    setRows(((data as any)?.items as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const seed = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-provision", { body: { action: "seed" } });
    setBusy(false);
    if (error) toast({ title: "Seed failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Seeded ${(data as any)?.inserted ?? 0} rows` }); load(); }
  };

  const openEditor = (r: Row) => {
    setEditing(r);
    setExcerpt(r.verbatim_excerpt ?? "");
    setPlainText(Array.isArray(r.plain_requirements) ? (r.plain_requirements as string[]).join("\n") : "");
  };

  const approve = async () => {
    if (!editing) return;
    setBusy(true);
    const plain_requirements = plainText.split("\n").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.functions.invoke("manage-provision", {
      body: { action: "approve", key: editing.key, verbatim_excerpt: excerpt, plain_requirements },
    });
    setBusy(false);
    if (error) toast({ title: "Approve failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Approved" }); setEditing(null); load(); }
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Provision registry</h1>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded border bg-background px-2 text-sm">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
          <Button variant="outline" onClick={seed} disabled={busy}>Seed from registries</Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Key</th><th className="p-2">Citation</th><th className="p-2">Status</th><th className="p-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="p-2 font-mono text-xs">{r.key}</td>
                <td className="p-2">{r.citation}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2"><Button size="sm" variant="ghost" onClick={() => openEditor(r)}>Edit</Button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No rows.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="text-sm font-medium">Editing {editing.key}</div>
          <div className="text-xs text-muted-foreground">{editing.citation}</div>
          <div>
            <Label htmlFor="excerpt">Verbatim excerpt</Label>
            <Textarea id="excerpt" rows={8} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="plain">Plain requirements (one per line)</Label>
            <Textarea id="plain" rows={4} value={plainText} onChange={(e) => setPlainText(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={approve} disabled={busy || !excerpt.trim()}>Approve</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
