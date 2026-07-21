import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Plus, Lock, Trash2, XCircle } from 'lucide-react';
import { useClientStore, type Client } from '@/stores/clientStore';
import { useActiveClient } from '@/hooks/useActiveClient';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { AddClientModal } from '@/components/clients/AddClientModal';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WorkspaceLayout from '@/components/dashboard/WorkspaceLayout';

interface EuNoticeStatus {
  frameworkCount: number;
  frameworks: string[];
  latestDate: string | null;
  refreshDueDate: string | null;
  daysUntilRefresh: number | null;
}

interface PerClientCounts {
  clientId: string;
  liaCount: number;
  dpiaCount: number;
  dpaCount: number;
  irCount: number;
  govCount: number;
  biometricCount: number;
  registrationCount: number;
  ropa: { latestVersion: number | null; latestDate: string | null };
  usNotices: { stateCount: number; latestDate: string | null };
  euNotices: EuNoticeStatus;
  totalFlags: number;
}


interface RpcRow {
  client_id: string;
  name: string;
  sector: string | null;
  lia_count: number;
  dpia_count: number;
  dpa_count: number;
  ir_count: number;
  gov_count: number;
  biometric_count: number;
  registration_count: number;
  ropa: { latest_version: number | null; latest_date: string | null };
  us_notices: { state_count: number; latest_date: string | null };
  eu_notices: { frameworks: string[]; latest_date: string | null; earliest_date: string | null };
}

function buildEuStatus(eu: RpcRow['eu_notices']): EuNoticeStatus {
  const frameworks = eu?.frameworks ?? [];
  if (!frameworks.length) {
    return { frameworkCount: 0, frameworks: [], latestDate: null, refreshDueDate: null, daysUntilRefresh: null };
  }
  const earliestMs = eu.earliest_date ? new Date(eu.earliest_date).getTime() : null;
  const refreshMs = earliestMs !== null ? earliestMs + 365 * 24 * 60 * 60 * 1000 : null;
  const days = refreshMs !== null ? Math.floor((refreshMs - Date.now()) / (24 * 60 * 60 * 1000)) : null;
  return {
    frameworkCount: frameworks.length,
    frameworks,
    latestDate: eu.latest_date,
    refreshDueDate: refreshMs ? new Date(refreshMs).toISOString() : null,
    daysUntilRefresh: days,
  };
}

function rpcRowToCounts(r: RpcRow): PerClientCounts {
  return {
    clientId: r.client_id,
    liaCount: r.lia_count ?? 0,
    dpiaCount: r.dpia_count ?? 0,
    dpaCount: r.dpa_count ?? 0,
    irCount: r.ir_count ?? 0,
    govCount: r.gov_count ?? 0,
    biometricCount: r.biometric_count ?? 0,
    registrationCount: r.registration_count ?? 0,
    ropa: {
      latestVersion: r.ropa?.latest_version ?? null,
      latestDate: r.ropa?.latest_date ?? null,
    },
    usNotices: {
      stateCount: r.us_notices?.state_count ?? 0,
      latestDate: r.us_notices?.latest_date ?? null,
    },
    euNotices: buildEuStatus(r.eu_notices),
    totalFlags:
      (r.lia_count ?? 0) +
      (r.dpia_count ?? 0) +
      (r.dpa_count ?? 0) +
      (r.ir_count ?? 0) +
      (r.gov_count ?? 0) +
      (r.biometric_count ?? 0) +
      (r.registration_count ?? 0),
  };
}


function CountRow({
  label,
  value,
  onClick,
  ariaLabel,
}: {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const content = (
    <>
      <span className="text-slate">{label}</span>
      <span className="font-semibold text-brand-navy tabular-nums">{value}</span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className="w-full flex items-baseline justify-between text-sm py-1 border-b border-brand-cloud/40 last:border-0 bg-transparent border-x-0 border-t-0 cursor-pointer text-left hover:bg-brand-cloud/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 rounded"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="flex items-baseline justify-between text-sm py-1 border-b border-brand-cloud/40 last:border-0">
      {content}
    </div>
  );
}

function ClientCard({
  client,
  counts,
  loading,
  onOpen,
  onOpenUsNotices,
  onDelete,
}: {
  client: Client;
  counts: PerClientCounts | null;
  loading: boolean;
  onOpen: () => void;
  onOpenUsNotices: () => void;
  onDelete: () => void;
}) {
  const total =
    (counts?.liaCount ?? 0) +
    (counts?.dpiaCount ?? 0) +
    (counts?.dpaCount ?? 0) +
    (counts?.irCount ?? 0) +
    (counts?.govCount ?? 0) +
    (counts?.biometricCount ?? 0) +
    (counts?.registrationCount ?? 0);

  return (
    <article className="bg-card border border-brand-cloud rounded-xl p-5 shadow-eup-sm hover:shadow-eup-md transition-shadow">
      <header className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-brand-navy flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-mist" />
            {client.name}
          </h2>
          {client.sector && (
            <p className="text-xs text-slate mt-0.5">{client.sector}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onDelete}
            className="text-xs font-medium text-slate hover:text-red-600 bg-transparent border-none cursor-pointer flex items-center gap-1"
            aria-label={`Delete ${client.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            onClick={onOpen}
            className="text-sm font-semibold text-brand-teal-text hover:text-brand-navy bg-transparent border-none cursor-pointer flex items-center gap-1"
          >
            Open <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-brand-cloud/60 rounded" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate mb-2">
            No documents generated yet for {client.name}.
          </p>
          <Link
            to="/dashboard"
            className="text-sm font-semibold text-brand-teal-text hover:text-brand-navy no-underline"
          >
            Go to tools →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <CountRow label="LIA assessments" value={counts!.liaCount} />
          <CountRow label="DPIA" value={counts!.dpiaCount} />
          <CountRow label="DPA documents" value={counts!.dpaCount} />
          <CountRow label="IR playbooks" value={counts!.irCount} />
          <CountRow label="Governance assessments" value={counts!.govCount} />
          <CountRow label="Biometric" value={counts!.biometricCount} />
          <CountRow label="Registration filings" value={counts!.registrationCount} />
          <CountRow
            label="RoPA"
            value={
              counts!.ropa.latestVersion
                ? `v${counts!.ropa.latestVersion}`
                : 'Not yet generated'
            }
          />
          <CountRow
            label="US Notices"
            value={
              counts!.usNotices.stateCount > 0
                ? `${counts!.usNotices.stateCount} states`
                : 'Not yet generated'
            }
            onClick={onOpenUsNotices}
            ariaLabel={`Open US Privacy Notices for ${client.name}`}
          />
          <CountRow
            label="EU & Global Notices"
            value={(() => {
              const eu = counts!.euNotices;
              if (eu.frameworkCount === 0) return 'No EU notices yet';
              const labels = eu.frameworks.map((f) => f.toUpperCase()).join(' + ');
              const days = eu.daysUntilRefresh;
              if (days === null) return labels;
              if (days <= 30) {
                return (
                  <span className="text-red-600">
                    {labels} · {days < 0 ? `Refresh overdue ${-days}d` : `Refresh due in ${days}d`}
                  </span>
                );
              }
              if (days <= 60) {
                return (
                  <span className="text-amber-700">
                    {labels} · Refresh due in {days}d
                  </span>
                );
              }
              const refreshLabel = eu.refreshDueDate
                ? new Date(eu.refreshDueDate).toLocaleString('en-US', { month: 'short', year: 'numeric' })
                : '';
              return `${labels}${refreshLabel ? ` · ${refreshLabel}` : ''} · Current`;
            })()}
          />
        </div>
      )}
    </article>
  );
}

export default function ClientsPortfolio() {
  const navigate = useNavigate();
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const { isMultiClient } = useActiveClient();
  const clients = useClientStore((s) => s.clients);
  const isLoadingClients = useClientStore((s) => s.isLoading);
  const loadClients = useClientStore((s) => s.loadClients);
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const deleteClient = useClientStore((s) => s.deleteClient);
  const { toast } = useToast();

  const [counts, setCounts] = useState<Record<string, PerClientCounts>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClients();
    document.title = 'My Clients — End User Privacy';
  }, [loadClients]);

  useEffect(() => {
    if (clients.length === 0) {
      setCountsLoading(false);
      setCounts({});
      return;
    }
    let cancelled = false;
    setCountsLoading(true);
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (!cancelled) setCountsLoading(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_portfolio_summary', { _user_id: uid });
      if (cancelled) return;
      if (error || !Array.isArray(data)) {
        setCounts({});
        setCountsLoading(false);
        return;
      }
      const map: Record<string, PerClientCounts> = {};
      for (const r of data as RpcRow[]) {
        map[r.client_id] = rpcRowToCounts(r);
      }
      setCounts(map);
      setCountsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clients]);


  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const fa = counts[a.id]?.totalFlags ?? 0;
      const fb = counts[b.id]?.totalFlags ?? 0;
      if (fb !== fa) return fb - fa;
      return a.name.localeCompare(b.name);
    });
  }, [clients, counts]);

  const heading = 'My Clients';
  const showAddButton = isMultiClient || isPremium;

  function handleOpen(c: Client) {
    setActiveClient(c);
    navigate('/clients');
  }

  function handleOpenUsNotices(c: Client) {
    setActiveClient(c);
    navigate('/us-notices');
  }

  function handleAddClick() {
    if (!isPremium && clients.length >= 1) {
      setShowGate(true);
      return;
    }
    setShowAdd(true);
  }

  return (
    <WorkspaceLayout className="bg-background">
      <section  className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-brand-navy">{heading}</h1>
          <p className="text-sm text-slate mt-1">
            Your complete compliance document status across all clients.
          </p>
        </div>
        {showAddButton && (
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add client
          </button>
        )}
      </header>

      {showGate && !isPremium && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-brand-navy font-medium">
              Managing compliance for multiple clients requires an Intelligence subscription.
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

      {(isLoadingClients || premiumLoading) && clients.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 bg-brand-cloud/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-card border border-brand-cloud rounded-xl p-8 text-center">
          <p className="text-slate mb-4">
            You don't have any clients set up yet.
          </p>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add your first client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedClients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              counts={counts[c.id] ?? null}
              loading={countsLoading && !counts[c.id]}
              onOpen={() => handleOpen(c)}
              onOpenUsNotices={() => handleOpenUsNotices(c)}
              onDelete={() => setConfirmDelete(c)}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-brand-cloud rounded-xl shadow-eup-md max-w-md w-full p-5">
            <h3 className="text-brand-navy mb-2">
              Delete {confirmDelete.name}?
            </h3>
            <p className="text-sm text-slate mb-4">
              This will permanently remove <strong>{confirmDelete.name}</strong> and
              all associated documents. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="text-sm px-3 py-1.5 border border-brand-cloud rounded-md bg-card text-slate"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!confirmDelete) return;
                  setDeleting(true);
                  try {
                    await deleteClient(confirmDelete.id);
                    toast({ title: 'Client deleted' });
                    setConfirmDelete(null);
                  } catch (err) {
                    toast({
                      title: 'Delete failed',
                      description: err instanceof Error ? err.message : 'Unknown error',
                      variant: 'destructive',
                    });
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="text-sm px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddClientModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />
      </section>
    </WorkspaceLayout>
  );
}
