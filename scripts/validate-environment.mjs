#!/usr/bin/env node

/**
 * Fail-closed guard for destructive/integration validation.
 * It intentionally does not print secret values.
 */
const testEnv = (process.env.CONFORM_TEST_ENV ?? '').trim().toLowerCase();
const supabaseEnvironment = (process.env.SUPABASE_ENVIRONMENT ?? '').trim().toLowerCase();
const nodeEnvironment = (process.env.NODE_ENV ?? '').trim().toLowerCase();
const e2eEnvironment = (process.env.E2E_ENVIRONMENT ?? '').trim().toLowerCase();
const allowRemote = process.env.CONFORM_ALLOW_REMOTE_TESTS === '1';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const stripeMode = (process.env.STRIPE_MODE || '').trim().toLowerCase();
const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const appUrl = process.env.APP_URL || process.env.E2E_BASE_URL || '';
const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS || '';
const smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST || '';
const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.MAIL_FROM || '';
const resendKey = process.env.RESEND_API_KEY || '';

const failures = [];

if (testEnv === 'local' && (supabaseEnvironment !== 'local' || nodeEnvironment !== 'test' || e2eEnvironment !== 'true')) {
  failures.push('Validação local exige SUPABASE_ENVIRONMENT=local, NODE_ENV=test e E2E_ENVIRONMENT=true.');
}

if (!['local', 'staging', 'homologacao', 'homologação'].includes(testEnv)) {
  failures.push('CONFORM_TEST_ENV deve ser local ou homologacao/staging.');
}

if (!supabaseUrl) {
  failures.push('VITE_SUPABASE_URL/SUPABASE_URL não foi definido.');
} else {
  try {
    const url = new URL(supabaseUrl);
    const isRemoteSupabase = url.hostname.endsWith('.supabase.co');
    const isKnownProductionProject = url.hostname === 'tvtpxgzwhakpypjdzphe.supabase.co';
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (isKnownProductionProject) {
      failures.push('Projeto Supabase de produÃ§Ã£o conhecido detectado; validaÃ§Ã£o interrompida.');
    }
    if (isRemoteSupabase && !(allowRemote && testEnv !== 'local')) {
      failures.push('Projeto Supabase remoto bloqueado: use Supabase local ou homologação explicitamente autorizada.');
    }
    if (testEnv === 'local' && !isLocal) {
      failures.push('CONFORM_TEST_ENV=local exige URL Supabase local.');
    }
  } catch {
    failures.push('URL Supabase inválida.');
  }
}

if (stripeMode !== 'test') {
  failures.push('STRIPE_MODE deve ser test.');
}
if (stripeSecret.startsWith('sk_live_')) {
  failures.push('Chave Stripe live detectada; testes interrompidos.');
}

if (testEnv === 'local') {
  for (const [name, value] of [['APP_URL', appUrl], ['ALLOWED_ORIGIN(S)', allowedOrigin]]) {
    if (!value) continue;
    try {
      const url = new URL(value.split(',')[0].trim());
      if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
        failures.push(`${name} precisa apontar para o runner local.`);
      }
    } catch {
      failures.push(`${name} invÃ¡lido para a validaÃ§Ã£o local.`);
    }
  }

  if (smtpHost && !['localhost', '127.0.0.1', 'inbucket', 'mailpit'].includes(smtpHost.split(':')[0])) {
    failures.push('SMTP externo detectado; use o capturador local Inbucket/Mailpit.');
  }
  if (resendKey) failures.push('RESEND_API_KEY nÃ£o pode existir na validaÃ§Ã£o local.');
  if (emailFrom) {
    const domain = emailFrom.split('@').pop()?.replace(/[>\s].*$/, '').toLowerCase() ?? '';
    if (!domain.endsWith('.test') && domain !== 'localhost') {
      failures.push('Remetente de e-mail real detectado; use um domÃ­nio reservado .test.');
    }
  }
}

if (failures.length > 0) {
  console.error('VALIDATION_ENVIRONMENT_BLOCKED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`VALIDATION_ENVIRONMENT_OK (${testEnv})`);
