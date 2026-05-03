import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Plus, Lock } from 'lucide-react';
import { useClientStore, type Client } from '@/stores/clientStore';
import { useActiveClient } from '@/hooks/useActiveClient';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { AddClientModal } from '@/components/clients/AddClientModal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface PerClientCounts {
  clientId: string;
  liaCount: number;
  dpiaCount: number;
  dpaCount: number;
  irCount: number;
  govCount: number;
  biometricCount: number;
  registrationCount: number;
  // Future tables — still tolerated as missing.
  ropa: { latestVersion: number | null; latestDate: string | null };
  usNotices: { stateCount: number; latestDate: string | null };
  euNotices: { frameworkCount: number; latestDate: string | null };
  totalFlags: number; // crude urgency proxy
}

async function safeCount(
  table: string,
  clientId: string
): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function loadUsNoticeStatus(
  clientId: string
): Promise<{ stateCount: number; latestDate: string | null }> {
  try {
    // Find the latest completed session for this client.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sessions, error } = await (supabase as any)
      .from('us_notice_sessions')
      .select('id, completed_at, status')
      .eq('client_id', clientId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(1);
    if (error || !sessions || sessions.length === 0) {
      return { stateCount: 0, latestDate: null };
    }
    const latest = sessions[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('us_notice_state_selections')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', latest.id);
    return {
      stateCount: count ?? 0,
      latestDate: latest.completed_at ?? null,
    };
  } catch {
    return { stateCount: 0, latestDate: null };
  }
}

async function loadCountsForClient(clientId: string): Promise<PerClientCounts> {
  const [
    liaCount,
    dpiaCount,
    dpaCount,
    irCount,
    govCount,
    biometricCount,
    registrationCount,
    usNotices,
  ] = await Promise.all([
    safeCount('li_assessments', clientId),
    safeCount('dpia_frameworks', clientId),
    safeCount('dpa_documents', clientId),
    safeCount('ir_playbooks', clientId),
    safeCount('governance_assessments', clientId),
    safeCount('biometric_assessments', clientId),
    safeCount('registration_orders', clientId),
    loadUsNoticeStatus(clientId),
  ]);

  return {
    clientId,
    liaCount,
    dpiaCount,
    dpaCount,
    irCount,
    govCount,
    biometricCount,
    registrationCount,
    ropa: { latestVersion: null, latestDate: null },
    usNotices,
    euNotices: { frameworkCount: 0, latestDate: null },
    totalFlags:
      liaCount + dpiaCount + dpaCount + irCount + govCount + biometricCount + registrationCount,
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
      <span className="font-semibold text-navy tabular-nums">{value}</span>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className="w-full flex items-baseline justify-between text-sm py-1 border-b border-fog/40 last:border-0 bg-transparent border-x-0 border-t-0 cursor-pointer text-left hover:bg-fog/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 rounded"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="flex items-baseline justify-between text-sm py-1 border-b border-fog/40 last:border-0">
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
}: {
  client: Client;
  counts: PerClientCounts | null;
  loading: boolean;
  onOpen: () => void;
  onOpenUsNotices: () => void;
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
    <article className="bg-card border border-fog rounded-xl p-5 shadow-eup-sm hover:shadow-eup-md transition-shadow">
      <header className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-navy flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-light" />
            {client.name}
          </h2>
          {client.sector && (
            <p className="text-xs text-slate mt-0.5">{client.sector}</p>
          )}
        </div>
        <button
          onClick={onOpen}
          className="text-sm font-semibold text-blue hover:text-navy bg-transparent border-none cursor-pointer flex items-center gap-1"
        >
          Open <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </header>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-fog/60 rounded" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate mb-2">
            No documents generated yet for {client.name}.
          </p>
          <Link
            to="/dashboard"
            className="text-sm font-semibold text-blue hover:text-navy no-underline"
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
            label="EU Notices"
            value={
              counts!.euNotices.frameworkCount > 0
                ? `${counts!.euNotices.frameworkCount} frameworks`
                : 'Not yet generated'
            }
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

  const [counts, setCounts] = useState<Record<string, PerClientCounts>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    loadClients();
    document.title = 'My Clients — End User Privacy';
  }, [loadClients]);

  useEffect(() => {
    if (clients.length === 0) {
      setCountsLoading(false);
      return;
    }
    setCountsLoading(true);
    Promise.all(clients.map((c) => loadCountsForClient(c.id))).then((results) => {
      const map: Record<string, PerClientCounts> = {};
      for (const r of results) map[r.clientId] = r;
      setCounts(map);
      setCountsLoading(false);
    });
  }, [clients]);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const fa = counts[a.id]?.totalFlags ?? 0;
      const fb = counts[b.id]?.totalFlags ?? 0;
      if (fb !== fa) return fb - fa;
      return a.name.localeCompare(b.name);
    });
  }, [clients, counts]);

  const heading = isMultiClient ? 'My Clients' : 'My Documents';
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy">{heading}</h1>
          <p className="text-sm text-slate mt-1">
            Your complete compliance document status across all clients.
          </p>
        </div>
        {showAddButton && (
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2 rounded-lg hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add client
          </button>
        )}
      </header>

      {showGate && !isPremium && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-navy font-medium">
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
            className="text-slate hover:text-navy bg-transparent border-none text-sm"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {(isLoadingClients || premiumLoading) && clients.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 bg-fog/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-card border border-fog rounded-xl p-8 text-center">
          <p className="text-slate mb-4">
            You don't have any clients set up yet.
          </p>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-steel to-blue px-4 py-2 rounded-lg hover:opacity-90"
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
            />
          ))}
        </div>
      )}

      <AddClientModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />
      </main>
      <Footer />
    </div>
  );
}
