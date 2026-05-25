import { useEffect } from 'react';
import { useClientStore } from '@/stores/clientStore';
import { useAuth } from '@/hooks/useAuth';

interface ClientSwitcherProps {
  /** Force render even when no real clients exist. */
  alwaysShow?: boolean;
  className?: string;
}

/**
 * Compact dropdown for switching between Personal workspace and any added
 * clients. Hidden by default when the user has no real clients.
 */
export function ClientSwitcher({ alwaysShow = false, className }: ClientSwitcherProps) {
  const clients = useClientStore((s) => s.clients);
  const personal = useClientStore((s) => s.personal);
  const activeClient = useClientStore((s) => s.activeClient);
  const isLoading = useClientStore((s) => s.isLoading);
  const loadClients = useClientStore((s) => s.loadClients);
  const setActiveClient = useClientStore((s) => s.setActiveClient);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!alwaysShow && clients.length === 0) return null;
  if (isLoading && clients.length === 0 && !personal) return null;

  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        value={activeClient?.id ?? ''}
        onChange={(e) => {
          const all = [personal, ...clients].filter(Boolean) as NonNullable<typeof personal>[];
          const selected = all.find((c) => c.id === e.target.value);
          if (selected) setActiveClient(selected);
        }}
        className="bg-card border border-brand-cloud rounded-md px-3 py-1.5 pr-8 text-sm
          font-medium text-brand-navy shadow-sm cursor-pointer appearance-none
          focus:outline-none focus:ring-2 focus:ring-brand-teal"
        aria-label="Switch workspace"
      >
        {personal && (
          <optgroup label="Personal">
            <option value={personal.id}>{personal.name}</option>
          </optgroup>
        )}
        {clients.length > 0 && (
          <optgroup label="Clients">
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-brand-mist">
        ▾
      </span>
    </div>
  );
}
