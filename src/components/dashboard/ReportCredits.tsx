import { useState } from "react";
import { FileText, Zap, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const INCLUDED_REPORTS = 6;

interface Bundle {
  id: string;
  credits: number;
  price: string;
  perReport: string;
  savings?: string;
  icon: React.ReactNode;
  popular?: boolean;
}

const BUNDLES: Bundle[] = [
  {
    id: "1",
    credits: 1,
    price: "$5",
    perReport: "$5.00/report",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "5",
    credits: 5,
    price: "$15",
    perReport: "$3.00/report",
    savings: "Save 40%",
    icon: <Package className="w-4 h-4" />,
    popular: true,
  },
  {
    id: "10",
    credits: 10,
    price: "$20",
    perReport: "$2.00/report",
    savings: "Save 60%",
    icon: <Zap className="w-4 h-4" />,
  },
];

interface ReportCreditsProps {
  reportsUsed: number;
  bonusCredits: number;
}

export default function ReportCredits({ reportsUsed, bonusCredits }: ReportCreditsProps) {
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const remaining = Math.max(0, INCLUDED_REPORTS + bonusCredits - reportsUsed);
  const includedRemaining = Math.max(0, INCLUDED_REPORTS - reportsUsed);
  const needsMore = remaining <= 1;

  const handlePurchase = async (bundleId: string) => {
    setPurchasing(bundleId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-report-credits", {
        body: { bundle: parseInt(bundleId) },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Purchase failed:", e);
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Usage meter */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary" />
          Report Credits
        </h4>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {remaining} remaining this month
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, (reportsUsed / (INCLUDED_REPORTS + bonusCredits || 1)) * 100)}%`,
            background: remaining <= 1
              ? "hsl(var(--destructive))"
              : remaining <= 2
                ? "hsl(40 96% 53%)"
                : "hsl(var(--primary))",
          }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground mb-4">
        {includedRemaining > 0
          ? `${includedRemaining} of ${INCLUDED_REPORTS} included reports remaining`
          : `Using bonus credits (${bonusCredits} remaining)`
        }
        {bonusCredits > 0 && includedRemaining > 0 && ` + ${bonusCredits} bonus`}
      </p>

      {/* Bundle options — always visible when low, toggleable otherwise */}
      {needsMore && (
        <div className="border-t border-border pt-4">
          <p className="text-[12px] font-semibold text-foreground mb-3">
            Need more reports? Purchase additional credits:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BUNDLES.map((bundle) => (
              <button
                key={bundle.id}
                onClick={() => handlePurchase(bundle.id)}
                disabled={purchasing !== null}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all cursor-pointer ${
                  bundle.popular
                    ? "border-primary bg-primary/5 hover:bg-primary/10"
                    : "border-border hover:border-primary/30 hover:bg-muted"
                } disabled:opacity-50`}
              >
                {bundle.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                    Best Value
                  </span>
                )}
                {bundle.savings && (
                  <span className="text-[9px] font-bold text-green-600">
                    {bundle.savings}
                  </span>
                )}
                <span className="text-[16px] font-bold text-foreground">{bundle.price}</span>
                <span className="text-[10px] text-muted-foreground">
                  {bundle.credits} report{bundle.credits > 1 ? "s" : ""}
                </span>
                <span className="text-[9px] text-muted-foreground">{bundle.perReport}</span>
                {purchasing === bundle.id && (
                  <span className="text-[9px] text-primary animate-pulse">Redirecting…</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
