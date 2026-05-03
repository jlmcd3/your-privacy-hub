import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useShallow } from 'zustand/react/shallow';

export interface Client {
  id: string;
  owner_id: string;
  name: string;
  sector: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ClientStore {
  clients: Client[];
  activeClient: Client | null;
  isLoading: boolean;
  error: string | null;
  loadClients: () => Promise<void>;
  setActiveClient: (client: Client) => void;
  createClient: (name: string, sector?: string) => Promise<Client>;
  updateClient: (
    id: string,
    updates: Partial<Pick<Client, 'name' | 'sector' | 'notes'>>
  ) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getActiveClientId: () => string | null;
}

export const useClientStore = create<ClientStore>()(
  persist(
    (set, get) => ({
      clients: [],
      activeClient: null,
      isLoading: false,
      error: null,

      loadClients: async () => {
        set({ isLoading: true, error: null });
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) {
          set({ isLoading: false, error: error.message });
          return;
        }

        const clientList = (data ?? []) as Client[];
        const current = get().activeClient;
        const stillActive = current
          ? clientList.find((c) => c.id === current.id) ?? null
          : null;

        set({
          clients: clientList,
          activeClient: stillActive ?? clientList[0] ?? null,
          isLoading: false,
        });
      },

      setActiveClient: (client) => set({ activeClient: client }),

      createClient: async (name, sector) => {
        const { data: userData } = await supabase.auth.getUser();
        const ownerId = userData.user?.id;
        if (!ownerId) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('clients')
          .insert({ name, sector: sector ?? null, owner_id: ownerId })
          .select()
          .single();
        if (error) throw new Error(error.message);
        const created = data as Client;
        set((state) => ({
          clients: [...state.clients, created].sort((a, b) =>
            a.name.localeCompare(b.name)
          ),
        }));
        return created;
      },

      updateClient: async (id, updates) => {
        const { error } = await supabase
          .from('clients')
          .update(updates)
          .eq('id', id);
        if (error) throw new Error(error.message);
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
          activeClient:
            state.activeClient?.id === id
              ? { ...state.activeClient, ...updates }
              : state.activeClient,
        }));
      },

      archiveClient: async (id) => {
        const { error } = await supabase
          .from('clients')
          .update({ is_active: false })
          .eq('id', id);
        if (error) throw new Error(error.message);
        set((state) => {
          const remaining = state.clients.filter((c) => c.id !== id);
          return {
            clients: remaining,
            activeClient:
              state.activeClient?.id === id
                ? remaining[0] ?? null
                : state.activeClient,
          };
        });
      },

      deleteClient: async (id) => {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);
        if (error) throw new Error(error.message);
        set((state) => {
          const remaining = state.clients.filter((c) => c.id !== id);
          return {
            clients: remaining,
            activeClient:
              state.activeClient?.id === id
                ? remaining[0] ?? null
                : state.activeClient,
          };
        });
      },

      getActiveClientId: () => get().activeClient?.id ?? null,
    }),
    {
      name: 'eup-active-client',
      partialize: (state) => ({ activeClient: state.activeClient }),
    }
  )
);

export function useClientLabel() {
  const clients = useClientStore((state) => state.clients);
  const isMultiClient = clients.length > 1;
  return {
    clientNoun: isMultiClient ? 'client' : 'organisation',
    clientNounPlural: isMultiClient ? 'clients' : 'organisations',
    clientNounCapital: isMultiClient ? 'Client' : 'Organisation',
  };
}

// Convenience selector hook to avoid re-renders when unrelated state changes.
export const useClientStoreShallow = <T>(
  selector: (state: ClientStore) => T
) => useClientStore(useShallow(selector));
