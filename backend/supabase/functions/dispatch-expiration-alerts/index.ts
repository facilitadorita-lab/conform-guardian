import { createClient } from "npm:@supabase/supabase-js@^2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("x-cron-secret") !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const emailWebhook = Deno.env.get("EMAIL_WEBHOOK_URL");
  if (!url || !serviceKey) return json({ error: "missing_supabase_secrets" }, 500);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: generated, error: generationError } = await supabase.rpc(
    "gerar_alertas_vencimento",
  );
  if (generationError) return json({ error: generationError.message }, 500);

  const { data: alerts, error: queueError } = await supabase
    .from("alertas")
    .select(
      "id,titulo,mensagem,data_vencimento,usuarios!alertas_usuario_id_fkey(nome,email),empresas!inner(nome_fantasia)",
    )
    .eq("email_status", "pendente")
    .is("deleted_at", null)
    .limit(100);
  if (queueError) return json({ error: queueError.message }, 500);

  let sent = 0;
  let failed = 0;
  for (const alert of alerts ?? []) {
    try {
      if (!emailWebhook) throw new Error("EMAIL_WEBHOOK_URL não configurado");
      const response = await fetch(emailWebhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          template: "expiration-alert",
          to: alert.usuarios?.email,
          recipientName: alert.usuarios?.nome,
          companyName: alert.empresas?.nome_fantasia,
          subject: alert.titulo,
          message: alert.mensagem,
          dueDate: alert.data_vencimento,
        }),
      });
      if (!response.ok) throw new Error(`Email webhook: ${response.status}`);
      await supabase
        .from("alertas")
        .update({ email_status: "enviado", email_enviado_at: new Date().toISOString() })
        .eq("id", alert.id);
      sent++;
    } catch (error) {
      await supabase.from("alertas").update({ email_status: "falhou" }).eq("id", alert.id);
      console.error("alert_send_failed", alert.id, error);
      failed++;
    }
  }

  return json({ generated, queued: alerts?.length ?? 0, sent, failed });
});
