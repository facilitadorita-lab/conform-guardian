import { createClient } from 'npm:@supabase/supabase-js@^2'

const origin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
const cors = {
  'access-control-allow-origin': origin,
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
}
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
const modules: Record<string, string> = { documentos: 'documentos', equipamentos: 'equipamentos', calibracoes: 'calibracoes', qualificacoes: 'qualificacoes', manutencoes: 'manutencoes', pendencias: 'pendencias' }
const mimeTypes = new Set(['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
const safeName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'-').replace(/-+/g,'-').slice(-120)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authorization = req.headers.get('authorization') ?? ''
  if (!url || !anonKey || !serviceKey || !authorization) return respond({ error: 'unauthorized' }, 401)

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return respond({ error: 'unauthorized' }, 401)

  const input = await req.json()
  const action = String(input.action ?? 'prepare')
  const empresaId = String(input.empresa_id ?? '')
  const modulo = String(input.modulo ?? '')
  const registroId = String(input.registro_id ?? '')
  if (!empresaId || !modules[modulo] || !registroId) return respond({ error: 'invalid_context' }, 400)

  const { data: canWrite } = await userClient.rpc('can_write_company', { p_empresa_id: empresaId })
  if (!canWrite) return respond({ error: 'forbidden' }, 403)
  const { data: source } = await userClient.from(modules[modulo]).select('id,empresa_id').eq('id', registroId).eq('empresa_id', empresaId).is('deleted_at', null).maybeSingle()
  if (!source) return respond({ error: 'source_not_found' }, 404)

  if (action === 'prepare') {
    const originalName = String(input.nome_original ?? '')
    const mime = String(input.mime_type ?? '')
    const size = Number(input.tamanho_bytes ?? 0)
    if (!originalName || !mimeTypes.has(mime) || size <= 0 || size > 20 * 1024 * 1024) return respond({ error: 'invalid_file' }, 400)
    const { data: quota, error: quotaError } = await userClient.rpc('api_verificar_limite_storage', { p_empresa_id: empresaId, p_novos_bytes: size })
    if (quotaError) return respond({ error: quotaError.message }, 400)
    if (!quota?.permitido) return respond({ error: 'storage_plan_limit_reached', usage: quota }, 409)
    const uploadId = crypto.randomUUID()
    const path = `${empresaId}/${modulo}/${registroId}/${uploadId}-${safeName(originalName)}`
    const { data, error } = await adminClient.storage.from('evidencias').createSignedUploadUrl(path)
    if (error) return respond({ error: error.message }, 500)
    return respond({ upload_id: uploadId, path, token: data.token, signed_url: data.signedUrl, expires_in: 7200 })
  }

  if (action === 'complete') {
    const path = String(input.path ?? '')
    const prefix = `${empresaId}/${modulo}/${registroId}/`
    if (!path.startsWith(prefix)) return respond({ error: 'invalid_path' }, 400)
    const folder = path.slice(0, path.lastIndexOf('/'))
    const filename = path.slice(path.lastIndexOf('/') + 1)
    const { data: files, error: listError } = await adminClient.storage.from('evidencias').list(folder, { search: filename, limit: 1 })
    if (listError || !files?.some(file => file.name === filename)) return respond({ error: 'upload_not_found' }, 404)

    const finalidade = String(input.finalidade ?? 'principal')
    let replacementId = input.substitui_anexo_id || null
    let version = 1
    if (!replacementId) {
      const { data: currentActive } = await adminClient
        .from('anexos')
        .select('id,versao')
        .eq('empresa_id', empresaId)
        .eq('modulo', modulo)
        .eq('registro_id', registroId)
        .eq('finalidade', finalidade)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      replacementId = currentActive?.id ?? null
    }

    if (replacementId) {
      const { data: previous } = await adminClient.from('anexos').select('id,versao').eq('id', replacementId).eq('empresa_id', empresaId).single()
      if (!previous) return respond({ error: 'replacement_not_found' }, 404)
      version = previous.versao + 1
      await adminClient.from('anexos').update({ status: 'substituido', updated_by: authData.user.id }).eq('id', replacementId)
    }
    const { data: attachment, error: insertError } = await adminClient.from('anexos').insert({
      empresa_id: empresaId, modulo, registro_id: registroId, finalidade,
      storage_path: path, nome_original: input.nome_original, mime_type: input.mime_type,
      tamanho_bytes: input.tamanho_bytes, versao: version, substitui_anexo_id: replacementId, created_by: authData.user.id,
    }).select().single()
    if (insertError) return respond({ error: insertError.message }, 500)

    await adminClient.from('logs_auditoria').insert({
      empresa_id: empresaId,
      usuario_id: authData.user.id,
      modulo,
      acao: replacementId ? 'substituicao_anexo' : 'upload_anexo',
      registro_id: registroId,
      novo_valor: {
        anexo_id: attachment.id,
        nome_original: input.nome_original,
        mime_type: input.mime_type,
        tamanho_bytes: input.tamanho_bytes,
        finalidade,
        versao: version,
        substitui_anexo_id: replacementId,
      },
    })

    return respond({ anexo: attachment }, 201)
  }

  return respond({ error: 'invalid_action' }, 400)
})
