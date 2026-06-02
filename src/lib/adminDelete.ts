import { supabase } from "@/integrations/supabase/client";

export type AdminDeleteType =
  | "ropa_session"
  | "ropa_document"
  | "us_notice_document"
  | "eu_notice_document"
  | "registration_document";

export async function adminDelete(type: AdminDeleteType, id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-delete", {
    body: { type, id },
  });
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
}
