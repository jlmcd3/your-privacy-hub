import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import ObligationsList from "@/components/obligations/ObligationsList";
import { ClientSwitcher } from "@/components/clients/ClientSwitcher";
import { useActiveClient } from "@/hooks/useActiveClient";

export default function Obligations() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const { clientId } = useActiveClient();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { navigate("/login?redirect=/obligations"); return; }
      setChecking(false);
    })();
    return () => { alive = false; };
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-brand-cloud">
        <Navbar />
        <main className="py-20 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-navy" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cloud flex flex-col">
      <Helmet><title>Obligations | End User Privacy</title></Helmet>
      <Navbar />
      <main className="flex-1">
        <PageContainer>
          <div className="py-10 space-y-6">
            <header className="space-y-2">
              <h1 className="text-3xl font-serif text-brand-navy">Obligations</h1>
              <p className="text-sm text-muted-foreground">
                Deadlines derived from documents you've generated — each links to its source.
              </p>
              <div className="pt-2"><ClientSwitcher /></div>
            </header>
            <ObligationsList clientId={clientId ?? undefined} />
          </div>
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
}
