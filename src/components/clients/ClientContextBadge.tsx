import { useState } from 'react';
import { useActiveClient } from '@/hooks/useActiveClient';
import { ClientSwitcher } from '@/components/clients/ClientSwitcher';

/**
 * Small badge shown on result pages indicating which client this work product
 * was prepared for. Only renders when the user has at least one client and
 * the result page is being viewed by an authenticated user.
 *
 * "Change client" toggles a ClientSwitcher inline below the badge. This is
 * cosmetic — the client_id is already stored on the result row in the database.
 */
export function ClientContextBadge() {
  const { clientName, isMultiClient } = useActiveClient();
  const [showSwitcher, setShowSwitcher] = useState(false);

  if (!clientName) return null;

  return (
    <div className="mb-4">
      <div className="inline-flex items-center gap-2 text-xs bg-brand-cloud/60 border border-brand-cloud rounded-full px-3 py-1">
        <span className="text-slate">Prepared for:</span>
        <span className="font-semibold text-brand-navy">{clientName}</span>
        {isMultiClient && (
          <button
            type="button"
            onClick={() => setShowSwitcher((v) => !v)}
            className="text-brand-teal hover:text-brand-navy bg-transparent border-none cursor-pointer text-xs font-medium ml-1"
          >
            {showSwitcher ? 'Hide' : 'Change client'}
          </button>
        )}
      </div>
      {showSwitcher && (
        <div className="mt-2">
          <ClientSwitcher />
        </div>
      )}
    </div>
  );
}
