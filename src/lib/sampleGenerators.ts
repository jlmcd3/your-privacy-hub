// ALL-PRODUCTS-TEST — shared sample-data generation runners.
//
// Lifted VERBATIM from src/pages/admin/AdminSampleReports.tsx (which now
// imports from here) so /admin/all-products-test and /admin/sample-reports
// can never drift on how a product's sample data is built and dispatched.
// Every insert/invoke/poll sequence below is the one that has been shipping.

import { supabase } from "@/integrations/supabase/client";
import type { SampleFixture } from "@/lib/sampleFixtures";

// FREEZE FIX (2026-08-30): `supabase.functions.invoke` is a plain fetch with
// NO timeout — a stalled connection (or an edge function the platform holds
// open) hangs the await forever, which froze the /admin/all-products-test
// sequential run loop mid-batch with no log output. Every invoke in this
// pipeline now races a client-side timeout. On timeout the underlying fetch
// is abandoned (the function may still be running server-side — the message
// says so); fire-and-poll call sites proceed to polling, id-returning call
// sites fail that one run honestly and the loop continues.
export interface TimedInvokeResult<T = any> {
  data: T | null;
  error: { message: string } | null;
  timedOut: boolean;
}

export async function invokeWithTimeout<T = any>(
  fn: string,
  body: unknown,
  timeoutMs: number,
): Promise<TimedInvokeResult<T>> {
  const call = supabase.functions
    .invoke(fn, { body })
    .then((r) => ({ data: (r.data ?? null) as T | null, error: r.error ? { message: r.error.message } : null, timedOut: false }));
  // Late settlement (success or failure) after the race must never surface
  // as an unhandled rejection.
  void call.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<TimedInvokeResult<T>>((resolve) => {
    timer = setTimeout(
      () =>
        resolve({
          data: null,
          error: {
            message: `no response from ${fn} after ${Math.round(timeoutMs / 1000)}s (client-side timeout — the function may still be running server-side)`,
          },
          timedOut: true,
        }),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([call, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// ROW-FIRST LAW (2026-08-31) — see the DPA/IR/biometric branches below.
// Creates the caller-owned row the generator's entitlement gate requires.
async function createOwnedRow(
  table: "dpa_documents" | "ir_playbooks" | "biometric_assessments",
  intake: Record<string, unknown>,
  userId: string,
  log: (m: string) => void,
): Promise<string> {
  log(`▶ Insert into ${table}...`);
  const { data, error } = await supabase
    .from(table)
    .insert({ user_id: userId, status: "pending", intake_data: intake } as never)
    .select("id")
    .single();
  if (error || !data?.id) throw new Error(`insert failed: ${error?.message ?? "no id"}`);
  return data.id as string;
}


export async function getOrCreatePersonalClient(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .limit(1);
  if (error) throw error;
  if (data?.length) return data[0].id;
  // ALL-PRODUCTS-TEST: the RoPA and Notice-Builder sample paths are
  // workspace-scoped. An admin account without a personal workspace used to
  // fail here BEFORE any intake was written — a pure environment problem
  // presenting as a product failure. Create the workspace instead.
  const { data: created, error: cErr } = await supabase
    .from("clients")
    .insert({ owner_id: userId, name: "Personal workspace", is_personal: true, is_active: true })
    .select("id")
    .single();
  if (cErr || !created) throw new Error(`could not create personal workspace client: ${cErr?.message}`);
  return created.id;
}


// Poll a table row until it reaches a terminal status. Returns the terminal status.
//
// WALL-CLOCK LAW (2026-08-31): the budget is REAL TIME, not a poll count.
// Chrome throttles `setTimeout` in a backgrounded tab to roughly one tick per
// minute, so a "90 polls × 4s = 6 minutes" budget silently stretched toward
// ~90 minutes and the whole batch looked frozen behind one product. The loop
// now stops as soon as `max × intervalMs` of wall-clock time has elapsed,
// whatever the browser does to the timers.
export async function pollRowStatus(
  table: string,
  id: string,
  opts: {
    max: number;
    intervalMs: number;
    complete: string[];
    failed: string[];
    errorCol?: string;
    /** Explicit wall-clock budget; defaults to max × intervalMs. */
    budgetMs?: number;
  },
  log: (msg: string) => void,
): Promise<void> {
  const budgetMs = opts.budgetMs ?? opts.max * opts.intervalMs;
  const startedAt = Date.now();
  const deadline = startedAt + budgetMs;
  for (let i = 0; Date.now() < deadline; i++) {
    await new Promise((r) => setTimeout(r, Math.min(opts.intervalMs, Math.max(0, deadline - Date.now()))));
    const cols = opts.errorCol ? `status, ${opts.errorCol}` : "status";
    // FREEZE FIX: one stalled status read must never hang the poll loop —
    // race it against 15s and treat a timeout as an unknown-status poll.
    // Supabase builders are PromiseLike without .catch — normalize first.
    const read = Promise.resolve((supabase as any).from(table).select(cols).eq("id", id).maybeSingle()) as Promise<{ data: any }>;
    void read.catch(() => {});
    const { data } = await Promise.race([
      read,
      new Promise<{ data: null }>((r) => setTimeout(() => r({ data: null }), 15_000)),
    ]);
    const status = data?.status as string | undefined;
    if (status && opts.complete.includes(status)) {
      log(`✅ status=${status} after ${i + 1} polls (${Math.round((Date.now() - startedAt) / 1000)}s)`);
      return;
    }
    if (status && opts.failed.includes(status)) {
      const detail = opts.errorCol ? data?.[opts.errorCol] : null;
      throw new Error(`generator status=${status}${detail ? `: ${detail}` : ""}`);
    }
    if (i % 5 === 0) {
      const leftS = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      log(`… poll ${i + 1} (status=${status ?? "?"}, ${leftS}s of budget left)`);
    }
  }
  throw new Error(
    `polling timed out after ${Math.round((Date.now() - startedAt) / 1000)}s (budget ${Math.round(budgetMs / 1000)}s)`,
  );
}

export async function runGenerator(
  fix: SampleFixture,
  userId: string,
  log: (msg: string) => void,
): Promise<{ sourceRowId: string; resultUrl: string }> {
  const f = fix.fixture as Record<string, unknown>;

  // -- LIA / DPIA / Governance / CPPA risk / CPPA cyber -------------------
  if (fix.tool_slug === "li_assessment" || fix.tool_slug === "dpia" ||
      fix.tool_slug === "governance" || fix.tool_slug === "cppa_risk" ||
      fix.tool_slug === "cppa_cyber" || fix.tool_slug === "cppa_admt") {
    const insert = { ...(f.insert as Record<string, unknown>), user_id: userId };
    const invoke = f.invoke as { fn: string; id_key: string };
    const poll = f.poll as { table: string; terminal: string[]; max: number; interval_ms: number };

    log(`▶ Insert into ${fix.source_table}...`);
    const { data: rec, error: insErr } = await (supabase as any).from(fix.source_table).insert(insert).select("id").single();
    if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);
    log(`✓ id=${rec.id}`);
    log(`▶ Invoking ${invoke.fn}...`);
    // FREEZE FIX: these functions write their outcome to the row's status
    // column, so the response body is not load-bearing — polling is. Wait at
    // most 30s for the ack, then move on to polling either way.
    const inv = await invokeWithTimeout(invoke.fn, { [invoke.id_key]: rec.id }, 30_000);
    if (inv.error) log(`⚠ fn ${inv.timedOut ? "ack timeout" : "error"} (polling anyway): ${inv.error.message}`);
    log(`▶ Polling ${poll.table} for completion...`);
    await pollRowStatus(
      poll.table,
      rec.id,
      {
        max: poll.max,
        intervalMs: poll.interval_ms,
        complete: ["complete"],
        // RELIABILITY FIX (2026-08-29): "cancelled" is a terminal status the
        // orchestrator recognises; without it here a cancelled row polled to
        // timeout instead of failing fast.
        failed: [...new Set([...poll.terminal.filter((t) => t !== "complete"), "cancelled"])],
      },
      log,
    );
    return { sourceRowId: rec.id, resultUrl: fix.result_url_pattern.replace("{id}", rec.id) };
  }

  // -- DPA / IR (202 background dispatch) ----------------------------------
  // These functions return { id, status: "processing" } immediately and write
  // status complete|failed to the row in the background. We MUST poll to a
  // terminal status before the PDF step, or generate-report-pdf will 409.
  //
  // ROW-FIRST LAW (2026-08-31): generate-dpa / generate-ir-playbook /
  // check-biometric-compliance answer 403 to any NON-service caller that does
  // not reference an existing row (new-row generation is reserved for the
  // payments webhook). The harness runs as a signed-in admin, so it creates
  // the owned row itself and invokes with `assessment_id` — requireEntitlement
  // then grants via the server-side admin bypass.
  if (fix.tool_slug === "dpa" || fix.tool_slug === "ir_playbook") {
    const invoke = f.invoke as { fn: string };
    const body =
      fix.tool_slug === "ir_playbook" && f.invoke_body
        ? { ...(f.invoke_body as Record<string, unknown>), user_id: userId }
        : { ...((f.invoke_body_extras as Record<string, unknown>) ?? {}), user_id: userId };
    const table = fix.tool_slug === "dpa" ? "dpa_documents" : "ir_playbooks";
    const rowId = await createOwnedRow(table, body, userId, log);
    log(`▶ Invoking ${invoke.fn} (background dispatch)...`);
    // FREEZE FIX: the 202 dispatch normally answers in seconds; 90s of
    // silence means this run failed to dispatch — fail it and let the batch
    // loop continue to the next run instead of hanging the whole batch.
    const { data, error } = await invokeWithTimeout<{ id?: string; error?: string }>(
      invoke.fn, { ...body, assessment_id: rowId }, 90_000,
    );
    if (error) throw new Error(`generator: ${error.message}`);
    if (data?.error) throw new Error(`generator: ${data.error}`);
    log(`✓ accepted id=${rowId} — polling for completion`);
    await pollRowStatus(
      table,
      rowId,
      { max: 90, intervalMs: 3000, complete: ["complete"], failed: ["failed", "error"] },
      log,
    );
    return { sourceRowId: rowId, resultUrl: fix.result_url_pattern.replace("{id}", rowId) };
  }

  // -- Biometric (synchronous single call) ---------------------------------
  if (fix.tool_slug === "biometric") {
    const invoke = f.invoke as { fn: string };
    const body = { ...((f.invoke_body_extras as Record<string, unknown>) ?? {}), user_id: userId };
    const rowId = await createOwnedRow("biometric_assessments", body, userId, log);
    log(`▶ Invoking ${invoke.fn}...`);
    // FREEZE FIX: synchronous generator — the response IS the result, so the
    // timeout is generous (5 min), but a dead connection can no longer hang
    // the batch loop forever.
    const { data, error } = await invokeWithTimeout<{ id?: string; error?: string }>(
      invoke.fn, { ...body, assessment_id: rowId }, 300_000,
    );
    if (error) throw new Error(`generator: ${error.message}`);
    if (data?.error) throw new Error(`generator: ${data.error}`);
    log(`✅ id=${data?.id ?? rowId}`);
    const id = data?.id ?? rowId;
    return { sourceRowId: id, resultUrl: fix.result_url_pattern.replace("{id}", id) };
  }


  // -- Registration (synchronous single call) ------------------------------
  // run-registration-assessment persists to `registration_assessments` and
  // returns { assessment_id, shareable_token, ... }. The result route is
  // token-addressed (/registration-manager/result/:token), so the row id
  // drives source_row_id while the token drives the result URL.
  if (fix.tool_slug === "registration") {
    const body = { ...((f.invoke_body as Record<string, unknown>) ?? {}), user_id: userId };
    log("▶ Invoking run-registration-assessment...");
    // FREEZE FIX: synchronous generator — generous 5-min cap, never infinite.
    const { data, error } = await invokeWithTimeout<{ assessment_id?: string; shareable_token?: string; error?: string }>(
      "run-registration-assessment", body, 300_000,
    );
    if (error || !data?.assessment_id) {
      throw new Error(`generator: ${error?.message || data?.error || "no assessment_id"}`);
    }
    log(`✅ id=${data.assessment_id} token=${data.shareable_token ?? "—"}`);
    return {
      sourceRowId: data.assessment_id,
      resultUrl: fix.result_url_pattern.replace("{id}", data.shareable_token ?? data.assessment_id),
    };
  }


  // -- RoPA --------------------------------------------------------------
  if (fix.tool_slug === "ropa") {
    const clientId = await getOrCreatePersonalClient(userId);
    log(`✓ client ${clientId}`);

    log("▶ Upsert ropa_client_profiles...");
    const { error: pErr } = await supabase.from("ropa_client_profiles").upsert(
      { client_id: clientId, ...(f.profile as Record<string, unknown>) },
      { onConflict: "client_id" },
    );
    if (pErr) throw new Error(`profile: ${pErr.message}`);

    log("▶ Create ropa_session...");
    const activities = f.activities as Array<Record<string, unknown>>;
    const { data: session, error: sErr } = await supabase
      .from("ropa_sessions")
      .insert({
        client_id: clientId,
        status: "review",
        version_number: 1,
        total_activities: activities.length,
        completed_activities: activities.length,
        payment_confirmed: true,
        paid_at: new Date().toISOString(),
        org_name: f.org_name as string,
      })
      .select("id")
      .single();
    if (sErr || !session) throw new Error(`session: ${sErr?.message}`);
    log(`✓ session ${session.id}`);

    log("▶ Upsert ropa_jurisdiction_selections...");
    const jurs = (f.jurisdictions as Array<{ code: string; name: string; region: string }>).map((j) => ({
      client_id: clientId,
      jurisdiction_code: j.code,
      jurisdiction_name: j.name,
      jurisdiction_region: j.region,
    }));
    const { error: jErr } = await (supabase as any)
      .from("ropa_jurisdiction_selections")
      .upsert(jurs, { onConflict: "client_id,jurisdiction_code" });
    if (jErr) throw new Error(`jurisdictions: ${jErr.message}`);

    log(`▶ Insert ${activities.length} activities + answers...`);
    const activityRows = activities.map((a, i) => ({
      session_id: session.id,
      client_id: clientId,
      display_name: a.activity_name as string,
      category: a.category as string,
      status: "complete" as const,
      completion_pct: 100,
      display_order: i,
    }));
    const { data: insertedActs, error: aErr } = await (supabase as any)
      .from("ropa_processing_activities")
      .insert(activityRows)
      .select("id, display_order");
    if (aErr || !insertedActs) throw new Error(`activities: ${aErr?.message}`);

    const answerRows: Array<{ activity_id: string; session_id: string; question_key: string; answer_value: unknown }> = [];
    for (const inserted of insertedActs) {
      const src = activities[inserted.display_order as number];
      const map: Record<string, unknown> = {
        purpose: src.purpose,
        lawful_basis: src.lawful_basis,
        special_category_basis: src.special_category_basis,
        data_subjects: src.data_subjects,
        data_categories: src.data_categories,
        recipients: src.recipients,
        processor_platform: src.recipients,
        transfer_destination: src.transfer_destination,
        transfer_mechanism: src.transfer_mechanism,
        retention_period: src.retention_period,
        retention_varies_by_category: src.retention_varies_by_category,
        retention_by_category: src.retention_by_category,
        security_measures: src.security_measures,
        access_controls: "Role-based access; quarterly access reviews; least-privilege enforced",
        activity_owner: src.activity_owner,
        collection_sources: src.collection_sources,
        processing_operations: src.processing_operations,
        related_assessments: src.related_assessments,
        rights_handling_override: src.rights_handling_override,
      };
      for (const [k, v] of Object.entries(map)) {
        if (v === undefined) continue;
        answerRows.push({ activity_id: inserted.id, session_id: session.id, question_key: k, answer_value: v });
      }
    }
    const { error: ansErr } = await (supabase as any).from("ropa_answers").insert(answerRows);
    if (ansErr) throw new Error(`answers: ${ansErr.message}`);

    log("▶ Invoking generate-ropa-document...");
    // FREEZE FIX: the outcome is polled from ropa_sessions below, so treat
    // this as fire-and-poll — a real error still fails the run, but an ack
    // timeout just proceeds to polling.
    const gen = await invokeWithTimeout(
      "generate-ropa-document",
      {
        session_id: session.id,
        format: "pdf",
        document_date: new Date().toISOString().slice(0, 10),
        author_name: f.author_name as string,
        approved_by_name: (f.approved_by_name as string) ?? null,
        approved_by_title: (f.approved_by_title as string) ?? null,
        approval_date: (f.approval_date as string) ?? null,
        next_review_due: (f.next_review_due as string) ?? null,
      },
      60_000,
    );
    if (gen.error && !gen.timedOut) throw new Error(`gen: ${gen.error.message}`);
    if (gen.timedOut) log(`⚠ ${gen.error!.message} — polling for the outcome anyway`);

    log("… polling ropa_sessions for generation to complete");
    await pollRowStatus(
      "ropa_sessions",
      session.id,
      { max: 60, intervalMs: 3000, complete: ["generated"], failed: ["failed"], errorCol: "generation_error" },
      log,
    );
    log("✅ pdf generated");

    const { data: ver } = await supabase
      .from("ropa_document_versions")
      .select("id")
      .eq("session_id", session.id)
      .eq("document_format", "pdf")
      .maybeSingle();
    return {
      sourceRowId: ver?.id ?? session.id,
      resultUrl: "/ropa/documents",
    };
  }

  // -- US / EU Notice (template generators) -------------------------------
  if (fix.tool_slug === "us_notice" || fix.tool_slug === "eu_notice") {
    const clientId = await getOrCreatePersonalClient(userId);
    log(`✓ client ${clientId}`);

    const sessionTable = fix.tool_slug === "us_notice" ? "us_notice_sessions" : "eu_notice_sessions";
    const selectionsTable = fix.tool_slug === "us_notice"
      ? "us_notice_state_selections" : "eu_notice_framework_selections";
    const answersTable = fix.tool_slug === "us_notice" ? "us_notice_answers" : "eu_notice_answers";
    const genFn = fix.tool_slug === "us_notice" ? "generate-us-notice" : "generate-eu-notice";

    log(`▶ Create ${sessionTable}...`);
    const session_init = {
      client_id: clientId,
      status: "review",
      payment_confirmed: true,
      paid_at: new Date().toISOString(),
      ...(f.session as Record<string, unknown>),
    };
    const { data: session, error: sErr } = await (supabase as any).from(sessionTable).insert(session_init).select("id").single();
    if (sErr || !session) throw new Error(`session: ${sErr?.message}`);
    log(`✓ session ${session.id}`);

    log("▶ Insert selections...");
    let selections: Array<Record<string, unknown>>;
    if (fix.tool_slug === "us_notice") {
      selections = (f.states as Array<{ name: string; code: string; framework: string }>).map((s) => ({
        session_id: session.id, state_code: s.code, state_name: s.name, framework_type: s.framework,
      }));
    } else {
      selections = (f.frameworks as Array<{ code: string; name: string; region: string }>).map((fw) => ({
        session_id: session.id, framework_code: fw.code, framework_name: fw.name, region: fw.region,
      }));
    }
    const { error: selErr } = await (supabase as any).from(selectionsTable).insert(selections);
    if (selErr) throw new Error(`selections: ${selErr.message}`);

    log("▶ Insert universal answers...");
    const universal = f.universal as Record<string, unknown>;
    const answerRows = Object.entries(universal).map(([k, v]) => ({
      session_id: session.id, question_key: k, answer_value: v,
    }));
    const { error: aErr } = await (supabase as any).from(answersTable).insert(answerRows);
    if (aErr) throw new Error(`answers: ${aErr.message}`);

    log(`▶ Invoking ${genFn}...`);
    // FREEZE FIX: EU notice is a 202/background dispatch (its outcome is
    // polled below — an ack timeout proceeds to polling); US notice is
    // synchronous (the response carries the documents), so it gets the
    // generous cap and an honest failure instead of an infinite hang.
    const isEu = fix.tool_slug === "eu_notice";
    const { data: gen, error: gErr, timedOut } = await invokeWithTimeout<{ error?: string; documents?: unknown[] }>(
      genFn, { session_id: session.id }, isEu ? 60_000 : 300_000,
    );
    if (gErr && !(isEu && timedOut)) throw new Error(`gen: ${gErr.message}`);
    if (isEu && timedOut) log(`⚠ ${gErr!.message} — polling for the outcome anyway`);
    if (gen?.error) throw new Error(`gen: ${gen.error}`);

    // EU notice is 202/background; US notice is still synchronous.
    let docCount = 0;
    if (fix.tool_slug === "eu_notice") {
      log("▶ Polling eu_notice_sessions for terminal status...");
      await pollRowStatus(
        "eu_notice_sessions",
        session.id,
        { max: 60, intervalMs: 3000, complete: ["generated"], failed: ["failed"], errorCol: "generation_error" },
        log,
      );
      const { data: sessRow } = await (supabase as any)
        .from("eu_notice_sessions").select("version_number").eq("id", session.id).maybeSingle();
      const { data: docRows, error: docsErr } = await (supabase as any)
        .from("eu_notice_documents").select("id")
        .eq("session_id", session.id)
        .eq("version_number", sessRow?.version_number ?? 1);
      if (docsErr) throw new Error(`docs query: ${docsErr.message}`);
      docCount = docRows?.length ?? 0;
    } else {
      if (!gen?.documents?.length) throw new Error("gen: no documents");
      docCount = gen.documents.length;
    }
    log(`✅ ${docCount} document(s) generated`);

    return { sourceRowId: session.id, resultUrl: fix.result_url_pattern.replace("{id}", session.id) };
  }

  throw new Error(`unknown tool_slug ${fix.tool_slug}`);
}
