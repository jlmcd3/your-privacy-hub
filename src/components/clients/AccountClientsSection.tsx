import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Lock, Pencil, Trash2, XCircle } from 'lucide-react';
import { useClientStore, type Client } from '@/stores/clientStore';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { SECTORS } from '@/constants/sectors';
import { useToast } from '@/hooks/use-toast';
import { AddClientModal } from '@/components/clients/AddClientModal';
import { supabase } from '@/integrations/supabase/client';

function safeCount(table: string, clientId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any)
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .then((r: { count: number | null; error: unknown }) => (r.error ? 0 : r.count ?? 0))
    .catch(() => 0);
}

function ClientRow({ client }: { client: Client }) {
  const updateClient = useClientStore((s) => s.updateClient);
  const deleteClient = useClientStore((s) => s.deleteClient);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(client.name);
  const [sector, setSector] = useState(client.sector ?? '');
  const [notes, setNotes] = useState(client.notes ?? '');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateClient(client.id, {
        name: name.trim(),
        sector: sector || null,
        notes: notes || null,
      });
      toast({ title: 'Client updated' });
      setEditing(false);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteClient(client.id);
      toast({ title: 'Client deleted' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="border-b border-brand-cloud last:border-0 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-brand-navy truncate">{client.name}</div>
          {client.sector && (
            <div className="text-xs text-slate">{client.sector}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-medium text-brand-teal-text hover:text-brand-navy bg-transparent border-none cursor-pointer flex items-center gap-1"
            disabled={busy}
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="text-xs font-medium text-slate hover:text-severity-warning bg-transparent border-none cursor-pointer flex items-center gap-1"
            disabled={busy}
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 bg-brand-cloud/30 p-3 rounded-md">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client name"
            className="w-full border border-brand-cloud rounded-md px-2.5 py-1.5 text-sm bg-card"
          />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full border border-brand-cloud rounded-md px-2.5 py-1.5 text-sm bg-card"
          >
            <option value="">Select sector…</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full border border-brand-cloud rounded-md px-2.5 py-1.5 text-sm bg-card"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setEditing(false);
                setName(client.name);
                setSector(client.sector ?? '');
                setNotes(client.notes ?? '');
              }}
              className="text-xs px-3 py-1.5 border border-brand-cloud rounded-md bg-card text-slate"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded-md bg-gradient-to-br from-brand-steel to-brand-teal text-white font-semibold disabled:opacity-50"
              disabled={busy || !name.trim()}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-brand-cloud rounded-xl shadow-eup-md max-w-md w-full p-5">
            <h3 className="text-brand-navy mb-2">
              Delete {client.name}?
            </h3>
            <p className="text-sm text-slate mb-4">
              This will permanently remove <strong>{client.name}</strong> and all
              associated documents. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="text-xs px-3 py-1.5 border border-brand-cloud rounded-md bg-card text-slate"
                disabled={busy}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="text-xs px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                disabled={busy}
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountClientsSection() {
  const { isPremium } = usePremiumStatus();
  const clients = useClientStore((s) => s.clients);
  const personal = useClientStore((s) => s.personal);
  const loadClients = useClientStore((s) => s.loadClients);
  const updateClient = useClientStore((s) => s.updateClient);
  const [showAdd, setShowAdd] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const { toast } = useToast();

  // Personal workspace inline edit
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalName, setPersonalName] = useState(personal?.name ?? '');
  const [personalBusy, setPersonalBusy] = useState(false);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (personal) setPersonalName(personal.name);
  }, [personal]);

  function handleAddClick() {
    if (!isPremium) {
      setShowGate(true);
      return;
    }
    setShowAdd(true);
  }

  async function handleSavePersonal() {
    if (!personal || !personalName.trim()) return;
    setPersonalBusy(true);
    try {
      await updateClient(personal.id, { name: personalName.trim() });
      toast({ title: 'Workspace updated' });
      setEditingPersonal(false);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPersonalBusy(false);
    }
  }

  return (
    <>
      {/* Personal workspace card */}
      <div className="bg-card border border-brand-cloud rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-brand-navy text-[14px] uppercase tracking-wider">
            My Workspace
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-[hsl(var(--brand-teal) / 0.1)] text-brand-navy px-2 py-0.5 rounded">
            Personal
          </span>
        </div>
        <p className="text-xs text-slate mb-3">
          Your own privacy programme — kept separate from any clients you manage.
        </p>

        {personal && (
          <>
            {editingPersonal ? (
              <div className="space-y-2">
                <input
                  value={personalName}
                  onChange={(e) => setPersonalName(e.target.value)}
                  className="w-full border border-brand-cloud rounded-md px-2.5 py-1.5 text-sm"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditingPersonal(false);
                      setPersonalName(personal.name);
                    }}
                    className="text-xs px-3 py-1.5 border border-brand-cloud rounded-md text-slate"
                    disabled={personalBusy}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePersonal}
                    className="text-xs px-3 py-1.5 rounded-md bg-gradient-to-br from-brand-steel to-brand-teal text-white font-semibold disabled:opacity-50"
                    disabled={personalBusy || !personalName.trim()}
                  >
                    {personalBusy ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center py-2.5 border-t border-brand-cloud">
                <div>
                  <div className="text-sm text-slate">Name</div>
                  <div className="text-[14px] font-semibold text-brand-navy">{personal.name}</div>
                </div>
                <button
                  onClick={() => setEditingPersonal(true)}
                  className="text-sm font-medium text-brand-teal-text hover:text-brand-navy bg-transparent border-none cursor-pointer"
                >
                  Rename
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Clients card */}
      <div className="bg-card border border-brand-cloud rounded-2xl p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-brand-navy text-[14px] uppercase tracking-wider">
            My Clients{clients.length > 0 ? ` — ${clients.length} active` : ''}
          </h2>
          <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
            Client work
          </span>
        </div>

        {clients.length === 0 ? (
          <div className="bg-gradient-to-br from-brand-teal/5 to-brand-mist/10 border border-brand-teal/20 rounded-xl p-4">
            <p className="text-sm text-brand-navy font-medium mb-1">
              Manage compliance for clients separately from your own workspace.
            </p>
            <p className="text-xs text-slate mb-3">
              Each client gets their own RoPA, notices, assessments, and documents — kept distinct from your personal workspace. Intelligence subscribers can add unlimited clients.
            </p>
            <div className="flex gap-3 items-center">
              {isPremium ? (
                <button
                  onClick={handleAddClick}
                  className="text-xs font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal px-3 py-1.5 rounded-md inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add your first client
                </button>
              ) : (
                <>
                  <Link to="/subscribe" className="text-sm font-semibold text-brand-teal-text hover:text-brand-navy no-underline">
                    Learn more →
                  </Link>
                  <Link
                    to="/subscribe"
                    className="text-xs font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal px-3 py-1.5 rounded-md no-underline"
                  >
                    Get Intelligence
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="divide-y divide-brand-cloud">
              {clients.map((c) => (
                <ClientRow key={c.id} client={c} />
              ))}
            </div>
            <button
              onClick={handleAddClick}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal px-4 py-2 rounded-lg hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Add new client
            </button>
          </div>
        )}

        {showGate && !isPremium && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-brand-navy">
                Managing compliance documents for multiple clients requires an Intelligence
                subscription.
              </p>
              <Link
                to="/subscribe"
                className="text-sm font-semibold text-amber-700 hover:text-amber-800 no-underline"
              >
                Get Intelligence →
              </Link>
            </div>
            <button
              onClick={() => setShowGate(false)}
              className="text-slate hover:text-brand-navy bg-transparent border-none text-sm"
              aria-label="Dismiss"
            >
              <XCircle aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} />
            </button>
          </div>
        )}

        <AddClientModal open={showAdd} onClose={() => setShowAdd(false)} />
      </div>
    </>
  );
}

interface ToolStatus {
  ropa: { latestVersion: number | null; latestDate: string | null };
  usNotices: { stateCount: number; latestDate: string | null };
  euNotices: { frameworkCount: number; latestDate: string | null };
}

export function ComplianceDocumentsSection() {
  const clients = useClientStore((s) => s.clients);
  const [status, setStatus] = useState<ToolStatus>({
    ropa: { latestVersion: null, latestDate: null },
    usNotices: { stateCount: 0, latestDate: null },
    euNotices: { frameworkCount: 0, latestDate: null },
  });
  const [usNoticesAvailable, setUsNoticesAvailable] = useState(true);

  useEffect(() => {
    if (clients.length === 0) return;
    const clientIds = clients.map((c) => c.id);
    (async () => {
      // Wrap us_notice_documents lookup in try/catch in case the table is not yet created.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sessions, error: sessErr } = await (supabase as any)
          .from('us_notice_sessions')
          .select('id, completed_at, status')
          .in('client_id', clientIds)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false, nullsFirst: false });
        if (sessErr) {
          setUsNoticesAvailable(false);
          return;
        }
        const sessionRows = sessions ?? [];
        if (sessionRows.length === 0) return;
        const latestSessionId = sessionRows[0].id;
        const latestDate = sessionRows[0].completed_at ?? null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count, error: stateErr } = await (supabase as any)
          .from('us_notice_state_selections')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', latestSessionId);
        if (stateErr) {
          setUsNoticesAvailable(false);
          return;
        }
        setStatus((prev) => ({
          ...prev,
          usNotices: { stateCount: count ?? 0, latestDate },
        }));
      } catch {
        setUsNoticesAvailable(false);
      }
      // EU notices — wrapped in try/catch in case the table is not yet created.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: euDocs, error: euErr } = await (supabase as any)
          .from('eu_notice_documents')
          .select('framework_code, generated_at, is_combined')
          .in('client_id', clientIds)
          .eq('is_current', true)
          .eq('is_combined', false);
        if (euErr) return;
        const rows = (euDocs ?? []) as Array<{ framework_code: string; generated_at: string }>;
        if (rows.length === 0) return;
        const frameworks = Array.from(new Set(rows.map((r) => r.framework_code))).sort();
        const latestMs = Math.max(...rows.map((r) => new Date(r.generated_at).getTime()));
        setStatus((prev) => ({
          ...prev,
          euNotices: {
            frameworkCount: frameworks.length,
            latestDate: new Date(latestMs).toISOString(),
          },
        }));
      } catch {
        /* table may not exist yet — silently ignore */
      }
    })();
  }, [clients]);

  function row(label: string, value: string, href: string) {
    return (
      <div className="flex justify-between items-center py-2.5 border-b border-brand-cloud last:border-0">
        <div>
          <div className="text-sm font-medium text-brand-navy">{label}</div>
          <div className="text-xs text-slate">{value}</div>
        </div>
        <Link
          to={href}
          className="text-sm font-medium text-brand-teal-text hover:text-brand-navy no-underline"
        >
          View →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-brand-cloud rounded-2xl p-6 mb-4">
      <h2 className="text-brand-navy text-[14px] uppercase tracking-wider mb-4">
        Compliance Documents
      </h2>
      <div>
        {row(
          'RoPA',
          status.ropa.latestVersion ? `v${status.ropa.latestVersion}` : 'Not yet generated',
          '/clients'
        )}
        {row(
          'US Privacy Notices',
          !usNoticesAvailable
            ? 'Not yet available'
            : status.usNotices.stateCount > 0
            ? `${status.usNotices.stateCount} states`
            : 'Not yet generated',
          '/us-notices'
        )}
        {row(
          'EU & Global Notices',
          status.euNotices.frameworkCount > 0
            ? `${status.euNotices.frameworkCount} frameworks${
                status.euNotices.latestDate
                  ? ` · ${new Date(status.euNotices.latestDate).toLocaleString('en-US', { month: 'short', year: 'numeric' })}`
                  : ''
              }`
            : 'Not yet generated',
          '/eu-notices'
        )}
      </div>
      <div className="mt-3 text-right">
        <Link
          to="/clients"
          className="text-sm font-semibold text-brand-teal-text hover:text-brand-navy no-underline"
        >
          View all documents →
        </Link>
      </div>
    </div>
  );
}

// Suppress unused warning for safeCount (kept for future expansion).
void safeCount;
