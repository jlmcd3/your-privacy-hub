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
  is_personal: boolean;
  created_at: string;
  updated_at: string;
}

interface ClientStore {
  /** Real client records only (excludes the personal workspace). */
  clients: Client[];
  /** The user's personal workspace row (auto-created on signup). */
  personal: Client | null;
  /** Currently active workspace — either the personal row or a client. */
  activeClient: Client | null;
  isLoading: boolean;
  error: string | null;
  loadClients: () => Promise<void>;
  setActiveClient: (client: Client) => void;
  /** Switch to the personal workspace. */
  switchToPersonal: () => void;
  createClient: (name: string, sector?: string) => Promise<Client>;
  updateClient: (
    id: string,
    updates: Partial<Pick<Client, 'name' | 'sector' | 'notes'>>
  ) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getActiveClientId: () => string | null;
  clearClients: () => void;
}

export const useClientStore = create<ClientStore>()(
  persist(
    (set, get) => ({
      clients: [],
      personal: null,
      activeClient: null,
      isLoading: false,
      error: null,

      loadClients: async () => {
        set({ isLoading: true, error: null });
        const { data: userData } = await supabase.auth.getUser();
        const ownerId = userData.user?.id ?? null;
        if (!ownerId) {
          set({ clients: [], personal: null, activeClient: null, isLoading: false });
          return;
        }
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) {
          set({ isLoading: false, error: error.message });
          return;
        }

        const all = (data ?? []) as Client[];
        const personal = all.find((c) => c.is_personal) ?? null;
        const realClients = all.filter((c) => !c.is_personal);

        const current = get().activeClient;
        // Re-resolve the active selection against the freshly loaded rows.
        // Default landing view: personal workspace.
        const stillActive = current && current.owner_id === ownerId
          ? all.find((c) => c.id === current.id) ?? null
          : null;

        set({
          clients: realClients,
          personal,
          activeClient: stillActive ?? personal ?? realClients[0] ?? null,
          isLoading: false,
        });
      },

      setActiveClient: (client) => set({ activeClient: client }),

      switchToPersonal: () => {
        const personal = get().personal;
        if (personal) set({ activeClient: personal });
      },

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
        set((state) => {
          const apply = (c: Client) =>
            c.id === id ? { ...c, ...updates } : c;
          return {
            clients: state.clients.map(apply),
            personal:
              state.personal?.id === id
                ? { ...state.personal, ...updates }
                : state.personal,
            activeClient:
              state.activeClient?.id === id
                ? { ...state.activeClient, ...updates }
                : state.activeClient,
          };
        });
      },

      deleteClient: async (id) => {
        // Guard: never delete the personal workspace row from the client.
        const personal = get().personal;
        if (personal && personal.id === id) {
          throw new Error('Cannot delete personal workspace');
        }
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
                ? state.personal ?? remaining[0] ?? null
                : state.activeClient,
          };
        });
      },

      getActiveClientId: () => get().activeClient?.id ?? null,

      clearClients: () =>
        set({ clients: [], personal: null, activeClient: null, isLoading: false, error: null }),
    }),
    {
      name: 'eup-active-client',
      partialize: (state) => ({ activeClient: state.activeClient }),
    }
  )
);

export function useClientLabel() {
  const clients = useClientStore((state) => state.clients);
  const hasClients = clients.length > 0;
  return {
    clientNoun: hasClients ? 'client' : 'organisation',
    clientNounPlural: hasClients ? 'clients' : 'organisations',
    clientNounCapital: hasClients ? 'Client' : 'Organisation',
  };
}

// Convenience selector hook to avoid re-renders when unrelated state changes.
export const useClientStoreShallow = <T>(
  selector: (state: ClientStore) => T
) => useClientStore(useShallow(selector));
