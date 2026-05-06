import { useEffect } from 'react';
import { useClientStore } from '@/stores/clientStore';
import { useAuth } from '@/hooks/useAuth';

export function useActiveClient() {
  const activeClient = useClientStore((s) => s.activeClient);
  const clients = useClientStore((s) => s.clients);
  const personal = useClientStore((s) => s.personal);
  const isLoading = useClientStore((s) => s.isLoading);
  const loadClients = useClientStore((s) => s.loadClients);
  const { user } = useAuth();

  useEffect(() => {
    if (user && clients.length === 0 && !personal && !isLoading) {
      loadClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    clientId: activeClient?.id ?? null,
    clientName: activeClient?.name ?? null,
    client: activeClient,
    clients, // real clients only (excludes personal workspace)
    personal,
    isPersonalActive: activeClient?.is_personal ?? false,
    isLoading,
    hasClients: clients.length > 0,
    isMultiClient: clients.length > 1,
  };
}
