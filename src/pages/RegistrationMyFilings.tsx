// User-facing dashboard listing all registration orders + filings + opt-out toggle.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileText, Calendar, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import RegistrationDisclaimer from "@/components/RegistrationDisclaimer";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";

export default function RegistrationMyFilings() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("registration_orders")
      .select("*, registration_filings(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function toggleReminders(orderId: string, enabled: boolean) {
    const { error } = await supabase
      .from("registration_orders")
      .update({ renewal_reminders_enabled: enabled })
      .eq("id", orderId);
    if (error) toast.error(error.message);
    else {
      toast.success(enabled ? "Renewal reminders on" : "Renewal reminders off");
      load();
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>My Filings | Registration Manager | End User Privacy</title>
      </Helmet>
      <Navbar />
      <DashboardSubnav />
      <PageContainer>
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-navy">My Filings</h1>
              <p className="text-sm text-slate mt-1">All your registration orders, documents, and renewal schedules.</p>
            </div>
            <Button asChild>
              <Link to="/registration-manager/start">New assessment <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-navy" /></div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 text-slate-light mx-auto mb-3" />
                <p className="text-slate mb-4">You haven't started a registration yet.</p>
                <Button asChild><Link to="/registration-manager/start">Start free assessment</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => {
                const filings = o.registration_filings || [];
                const hasReminders = o.renewal_reminders_enabled !== false;
                return (
                  <Card key={o.id} className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <CardTitle className="text-base text-navy">
                            {o.tier === "diy" ? "DIY" : o.tier === "counsel_review" || o.tier === "done_for_you" ? "Counsel-Ready Pack" : "Renewal"} · {o.jurisdictions.length} jurisdiction{o.jurisdictions.length === 1 ? "" : "s"}
                          </CardTitle>
                          <p className="text-xs text-slate mt-1">
                            {new Date(o.created_at).toLocaleDateString()} · ${(o.amount_cents / 100).toFixed(0)} {o.currency.toUpperCase()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge variant="outline">{o.payment_status}</Badge>
                          <Badge variant={o.fulfillment_status === "documents_ready" ? "default" : "secondary"}>
                            {o.fulfillment_status?.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {o.jurisdictions.map((j: string) => (
                          <Badge key={j} variant="outline" className="text-[10px] font-mono">{j}</Badge>
                        ))}
                      </div>

                      {filings.length > 0 && (
                        <div className="text-xs text-slate space-y-1">
                          <div className="font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Filed</div>
                          {filings.map((f: any) => (
                            <div key={f.id} className="ml-4">
                              {f.jurisdiction_code} — filed {new Date(f.filed_at).toLocaleDateString()}
                              {f.expires_at && ` · expires ${new Date(f.expires_at).toLocaleDateString()}`}
                            </div>
                          ))}
                        </div>
                      )}

                      {o.next_renewal_at && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                          Next renewal: {new Date(o.next_renewal_at).toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-center gap-2">
                          <Switch checked={hasReminders} onCheckedChange={(v) => toggleReminders(o.id, v)} id={`rem-${o.id}`} />
                          <label htmlFor={`rem-${o.id}`} className="text-xs text-slate cursor-pointer">Renewal reminders</label>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/registration-manager/order/${o.id}`}>Order details</Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link to={`/registration-manager/documents/${o.id}`}>View documents</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="mt-8">
            <RegistrationDisclaimer variant="compact" />
          </div>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}
