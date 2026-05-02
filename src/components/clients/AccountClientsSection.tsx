import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Lock, Pencil, Archive } from 'lucide-react';
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
  const archiveClient = useClientStore((s) => s.archiveClient);
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

  async function handleArchive() {
    setBusy(true);
    try {
      await archiveClient(client.id);
      toast({ title: 'Client archived' });
    } catch (err) {
      toast({
        title: 'Archive failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="border-b border-fog last:border-0 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy truncate">{client.name}</div>
          {client.sector && (
            <div className="text-xs text-slate">{client.sector}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-xs font-medium text-blue hover:text-navy bg-transparent border-none cursor-pointer flex items-center gap-1"
            disabled={busy}
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setConfirming(true)}
            className="text-xs font-medium text-slate hover:text-warn bg-transparent border-none cursor-pointer flex items-center gap-1"
            disabled={busy}
          >
            <Archive className="w-3 h-3" /> Archive
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2 bg-fog/30 p-3 rounded-md">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client name"
            className="w-full border border-fog rounded-md px-2.5 py-1.5 text-sm bg-card"
          />
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full border border-fog rounded-md px-2.5 py-1.5 text-sm bg-card"
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
            className="w-full border border-fog rounded-md px-2.5 py-1.5 text-sm bg-card"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setEditing(false);
                setName(client.name);
                setSector(client.sector ?? '');
                setNotes(client.notes ?? '');
              }}
              className="text-xs px-3 py-1.5 border border-fog rounded-md bg-card text-slate"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded-md bg-gradient-to-br from-steel to-blue text-white font-semibold disabled:opacity-50"
              disabled={busy || !name.trim()}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-md">
          <p className="text-sm text-navy mb-2">
            Archive <strong>{client.name}</strong>? Their documents are retained but this
            client will no longer appear in your switcher. You can reactivate them from
            Support.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setConfirming(false)}
              className="text-xs px-3 py-1.5 border border-fog rounded-md bg-card text-slate"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              onClick={handleArchive}
              className="text-xs px-3 py-1.5 rounded-md bg-warn text-white font-semibold disabled:opacity-50"
              disabled={busy}
            >
              {busy ? 'Working…' : 'Archive'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountClientsSection() {
  const { isPremium } = usePremiumStatus();
  const clients = useClientStore((s) => s.clients);
  const loadClients = useClientStore((s) => s.loadClients);
  const updateClient = useClientStore((s) => s.updateClient);
  const [showAdd, setShowAdd] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const { toast } = useToast();

  // Single-client inline edit
  const [editingSingle, setEditingSingle] = useState(false);
  const single = clients[0];
  const [singleName, setSingleName] = useState(single?.name ?? '');
  const [singleBusy, setSingleBusy] = useState(false);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    if (single) setSingleName(single.name);
  }, [single?.name]);

  const isMulti = clients.length > 1;

  function handleAddClick() {
    if (!isPremium) {
      setShowGate(true);
      return;
    }
    setShowAdd(true);
  }

  async function handleSaveSingle() {
    if (!single || !singleName.trim()) return;
    setSingleBusy(true);
    try {
      await updateClient(single.id, { name: singleName.trim() });
      toast({ title: 'Organisation updated' });
      setEditingSingle(false);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSingleBusy(false);
    }
  }

  return (
    <div className="bg-card border border-fog rounded-2xl p-6 mb-4">
      <h2 className="font-semibold text-navy text-[14px] uppercase tracking-wider mb-4">
        {isMulti ? `My Clients — ${clients.length} active` : 'My Organisation'}
      </h2>

      {!isMulti && single && (
        <div>
          {editingSingle ? (
            <div className="space-y-2">
              <input
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                className="w-full border border-fog rounded-md px-2.5 py-1.5 text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingSingle(false);
                    setSingleName(single.name);
                  }}
                  className="text-xs px-3 py-1.5 border border-fog rounded-md text-slate"
                  disabled={singleBusy}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSingle}
                  className="text-xs px-3 py-1.5 rounded-md bg-gradient-to-br from-steel to-blue text-white font-semibold disabled:opacity-50"
                  disabled={singleBusy || !singleName.trim()}
                >
                  {singleBusy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center py-2.5 border-b border-fog">
              <div>
                <div className="text-[13px] text-slate">Name</div>
                <div className="text-[14px] font-semibold text-navy">{single.name}</div>
                {single.sector && (
                  <div className="text-xs text-slate mt-0.5">Sector: {single.sector}</div>
                )}
              </div>
              <button
                onClick={() => setEditingSingle(true)}
                className="text-[13px] font-medium text-blue hover:text-navy bg-transparent border-none cursor-pointer"
              >
                Edit name
              </button>
            </div>
          )}

          <div className="mt-4 bg-gradient-to-br from-blue/5 to-sky/10 border border-blue/20 rounded-xl p-4">
            <p className="text-sm text-navy font-medium mb-1">
              Want to manage compliance for multiple clients?
            </p>
            <p className="text-xs text-slate mb-3">
              Intelligence subscribers can add unlimited clients.
            </p>
            <div className="flex gap-3 items-center">
              <Link to="/subscribe" className="text-sm font-semibold text-blue hover:text-navy no-underline">
                Learn more →
              </Link>
              <Link
                to="/subscribe"
                className="text-xs font-semibold text-white bg-gradient-to-br from-steel to-blue px-3 py-1.5 rounded-md no-underline"
              >
                Get Intelligence
              </Link>
            </div>
          </div>
        </div>
      )}

      {isMulti && (
        <div>
          <div className="divide-y divide-fog">
            {clients.map((c) => (
              <ClientRow key={c.id} client={c} />
            ))}
          </div>
          <button
            onClick={handleAddClick}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add new client
          </button>
        </div>
      )}

      {showGate && !isPremium && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-navy">
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
            className="text-slate hover:text-navy bg-transparent border-none text-sm"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <AddClientModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
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
    })();
  }, [clients]);

  function row(label: string, value: string, href: string) {
    return (
      <div className="flex justify-between items-center py-2.5 border-b border-fog last:border-0">
        <div>
          <div className="text-[13px] font-medium text-navy">{label}</div>
          <div className="text-xs text-slate">{value}</div>
        </div>
        <Link
          to={href}
          className="text-[13px] font-medium text-blue hover:text-navy no-underline"
        >
          View →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card border border-fog rounded-2xl p-6 mb-4">
      <h2 className="font-semibold text-navy text-[14px] uppercase tracking-wider mb-4">
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
            ? `${status.euNotices.frameworkCount} frameworks`
            : 'Not yet generated',
          '/clients'
        )}
      </div>
      <div className="mt-3 text-right">
        <Link
          to="/clients"
          className="text-sm font-semibold text-blue hover:text-navy no-underline"
        >
          View all documents →
        </Link>
      </div>
    </div>
  );
}

// Suppress unused warning for safeCount (kept for future expansion).
void safeCount;
