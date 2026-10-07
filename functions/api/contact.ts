import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  subject: z.string().trim().min(2).max(180),
  message: z.string().trim().min(10).max(2500)
});

declare global {
  var __contactRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

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
  if (!key) {
    return {
      success: true,
      preview: true,
      message: 'Preview mode: message accepted locally. Add RESEND_API_KEY in production to send mail.'
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'portfolio@pages.dev',
      to: [env.CONTACT_TO_EMAIL || 'yugdshahcs@gmail.com'],
      subject: `Portfolio contact: ${payload.subject}`,
      reply_to: payload.email,
      html: `
        <h2>New portfolio message</h2>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Subject:</strong> ${payload.subject}</p>
        <p><strong>Message:</strong></p>
        <p>${payload.message.replace(/\n/g, '<br />')}</p>
      `
    })
  });

  if (!response.ok) {
    const result = (await response.json()) as { message?: string };
    return {
      success: false,
      preview: false,
      message: result.message || 'Unable to send email right now.'
    };
  }

  return { success: true, preview: false, message: 'Message sent successfully.' };
}

export async function onRequest({ request, env }: { request: Request; env: Record<string, string | undefined> }) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed.' }, { status: 405 });
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
    return Response.json(
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
    return Response.json({ success: false, error: 'A valid JSON request body is required.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: 'Please complete all fields with valid values.',
        issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message }))
      },
      { status: 400 }
    );
  }

  const turnstile = await verifyTurnstile((body as { turnstileToken?: string })?.turnstileToken, ip, env);
  if (!turnstile.success) {
    return Response.json({ success: false, error: turnstile.error || 'Turnstile verification failed.' }, { status: 400 });
  }

  const emailResult = await sendEmail(parsed.data, env);
  if (!emailResult.success) {
    return Response.json({ success: false, error: emailResult.message }, { status: 500 });
  }

  return Response.json({
    success: true,
    message: emailResult.message,
    preview: emailResult.preview
  });
}
