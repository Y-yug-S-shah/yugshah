import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().pipe(z.email()),
  subject: z.string().trim().min(2).max(180),
  message: z.string().trim().min(10).max(2500),
  company_website: z.string().optional() // Honeypot field to trap automated spambots
});

declare global {
  var __contactRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const MAX_PAYLOAD_BYTES = 32 * 1024; // 32 KB limit to prevent DoS memory exhaustion

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...SECURITY_HEADERS,
      ...(init?.headers || {})
    }
  });
}

function getRateLimitMap() {
  if (!globalThis.__contactRateLimit) {
    globalThis.__contactRateLimit = new Map();
  }
  return globalThis.__contactRateLimit;
}

async function verifyTurnstile(token: string | undefined, ip: string, env: Record<string, string | undefined>) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: true, preview: true };
  }

  if (!token) {
    return { success: false, preview: false, error: 'Turnstile verification is required.' };
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: ip
    }).toString()
  });

  const payload = (await response.json()) as { success?: boolean };
  return { success: Boolean(payload.success), preview: false };
}

async function sendEmail(
  payload: { name: string; email: string; subject: string; message: string },
  env: Record<string, string | undefined>
) {
  const key = env.RESEND_API_KEY;
  const from = env.RESEND_FROM_EMAIL;
  if (!key || !from) {
    return {
      success: false,
      preview: false,
      status: 503,
      message: 'Message delivery is temporarily unavailable.'
    };
  }

  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [env.CONTACT_TO_EMAIL || 'yugdshahcs@gmail.com'],
      subject: `Portfolio contact: ${escapeHtml(payload.subject)}`,
      reply_to: payload.email,
      html: `
        <h2>New portfolio message</h2>
        <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(payload.subject)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(payload.message).replace(/\n/g, '<br />')}</p>
      `
    })
  });

  if (!response.ok) {
    return {
      success: false,
      preview: false,
      status: 502,
      message: 'Unable to send your message right now. Please try again or email directly.'
    };
  }

  return { success: true, preview: false, message: 'Message sent successfully.' };
}

export async function onRequest({ request, env }: { request: Request; env: Record<string, string | undefined> }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: SECURITY_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed.' }, { status: 405 });
  }

  // OWASP A01: Broken Access Control & CSRF Defense — Block cross-origin requests
  const secFetchSite = request.headers.get('Sec-Fetch-Site');
  if (secFetchSite && secFetchSite === 'cross-site') {
    return jsonResponse({ success: false, error: 'Cross-origin requests are forbidden.' }, { status: 403 });
  }

  // OWASP A04: Insecure Design & Resource Exhaustion Defense — Verify content type & payload size
  const contentType = request.headers.get('Content-Type');
  if (!contentType || !contentType.toLowerCase().includes('application/json')) {
    return jsonResponse({ success: false, error: 'Unsupported media type. JSON is required.' }, { status: 415 });
  }

  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return jsonResponse({ success: false, error: 'Payload size exceeds allowable limit.' }, { status: 413 });
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'local-preview';
  const map = getRateLimitMap();
  const now = Date.now();
  const entry = map.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return jsonResponse(
      { success: false, error: 'Too many requests. Please wait a few moments and try again.' },
      { status: 429 }
    );
  }

  entry.count += 1;
  map.set(ip, entry);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'A valid JSON request body is required.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        success: false,
        error: 'Please complete all fields with valid values.',
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
      },
      { status: 400 }
    );
  }

  // OWASP A04: Honeypot spambot deflection — Silently discard bot submissions
  if (parsed.data.company_website) {
    return jsonResponse({ success: true, message: 'Message sent successfully.' });
  }

  const turnstile = await verifyTurnstile((body as { turnstileToken?: string })?.turnstileToken, ip, env);
  if (!turnstile.success) {
    return jsonResponse({ success: false, error: turnstile.error || 'Turnstile verification failed.' }, { status: 400 });
  }

  const emailResult = await sendEmail(parsed.data, env);
  if (!emailResult.success) {
    return jsonResponse({ success: false, error: emailResult.message }, { status: emailResult.status });
  }

  return jsonResponse({
    success: true,
    message: emailResult.message,
    preview: emailResult.preview
  });
}
