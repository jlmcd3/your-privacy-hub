import { useState } from 'react';
import { useClientStore } from '@/stores/clientStore';
import { SECTORS } from '@/constants/sectors';
import { useToast } from '@/hooks/use-toast';

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (clientId: string) => void;
}

export function AddClientModal({ open, onClose, onCreated }: AddClientModalProps) {
  const createClient = useClientStore((s) => s.createClient);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const created = await createClient(name.trim(), sector || undefined);
      toast({ title: 'Client created', description: name.trim() });
      onCreated?.(created.id);
      setName('');
      setSector('');
      onClose();
    } catch (err) {
      toast({
        title: 'Could not create client',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-eup-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-navy mb-4">Add a new client</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-navy mb-1">
              Client name <span className="text-red-500">*</span>
            </label>
            <input
              id="client-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-fog rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
              placeholder="e.g. Acme Corporation"
            />
          </div>
          <div>
            <label htmlFor="client-sector" className="block text-sm font-medium text-navy mb-1">
              Sector
            </label>
            <select
              id="client-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="w-full border border-fog rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue"
            >
              <option value="">Select sector (optional)…</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate hover:text-navy bg-transparent border border-fog rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
