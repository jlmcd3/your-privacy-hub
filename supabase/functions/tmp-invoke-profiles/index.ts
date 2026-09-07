// TEMPORARY helper (doc 207 track 2 step 1): invokes the admin-gated
// generate-corpus-relevance-profiles with the service-role key that only
// exists inside the edge runtime. Deleted immediately after the run.
Deno.serve(async (_req: Request) => {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-corpus-relevance-profiles`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
    body: JSON.stringify({
      action: "generate",
      product: "lia",
      // LIA_FACTOR_VOCABULARY, verbatim from
      // run-li-assessment/_local/corpus/maps/lia-corpus-map.ts — passed
      // explicitly because the deployed map-sources stub is dark by design.
      factors: [
        "Interest legitimacy",
        "Third-party interests",
        "Necessity and less-intrusive means",
        "Balancing of interests, rights and freedoms",
        "Reasonable expectations of the data subject",
        "Relationship with the individual",
        "Potential harms and severity",
        "Safeguards and mitigations",
        "Children's data",
        "Public-authority exclusion",
        "Special-category and ePrivacy interplay",
      ],
    }),
  });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
});
