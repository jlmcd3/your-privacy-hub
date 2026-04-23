// Homepage cross-link banner introducing the Registration Manager.
// Goes between existing sections on the homepage.

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";

export default function RegistrationManagerBanner() {
  return (
    <section className="my-8 px-4">
      <div className="max-w-[1280px] mx-auto rounded-xl border border-navy/15 bg-gradient-to-br from-navy via-navy to-steel text-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <Badge className="bg-amber-400 text-navy hover:bg-amber-400 mb-3">
              <Sparkles className="w-3 h-3 mr-1" /> Registration Manager
            </Badge>
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Privacy registration filings — drafted in minutes
            </h2>
            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
              DPO appointments, RoPA templates, EU AI Act registrations, and Article 27 letters —
              tailored to your jurisdictions. Free assessment. Pay only when you generate documents.
            </p>
          </div>
          <Button asChild size="lg" className="bg-amber-400 text-navy hover:bg-amber-300 flex-shrink-0">
            <Link to="/registration-manager">
              Start free assessment <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
