import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("no", { status: 405 });
  const { email, password, token } = await req.json();
  if (token !== Deno.env.get("TMP_PROVISION_TOKEN")) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  return new Response(
    JSON.stringify({ id: data?.user?.id ?? null, error: error?.message ?? null }),
    { status: error ? 400 : 200, headers: { "Content-Type": "application/json" } },
  );
});
