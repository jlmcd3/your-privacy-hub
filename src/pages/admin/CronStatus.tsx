import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageContainer from "@/components/PageContainer";

interface CronJob {
  jobid: number;
  jobname: string | null;
  schedule: string;
  command: string;
  active: boolean;
}

export default function CronStatus() {
  const [jobs, setJobs] = useState<CronJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.functions.invoke("get-cron-schedule").then(({ data, error }) => {
      if (error) setError(error.message);
      else if (Array.isArray(data)) setJobs(data as CronJob[]);
      else if (data?.error) setError(String(data.error));
    });
  }, []);

  return (
    <PageContainer width="wide" className="py-8">
      <h1 className="font-serif mb-4">Cron Schedule</h1>
      {error && <div className="text-severity-warning mb-4">Error: {error}</div>}
      {!jobs && !error && <div>Loading…</div>}
      {jobs && (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-brand-cloud text-left">
              <th className="py-2 pr-4">Job name</th>
              <th className="py-2 pr-4">Schedule</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2">Command (first 120 chars)</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.jobid} className="border-b border-brand-cloud/60 align-top">
                <td className="py-2 pr-4 font-mono">{j.jobname ?? `#${j.jobid}`}</td>
                <td className="py-2 pr-4 font-mono">{j.schedule}</td>
                <td className="py-2 pr-4">{j.active ? "yes" : "no"}</td>
                <td className="py-2 font-mono text-xs">{j.command.slice(0, 120)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageContainer>
  );
}
