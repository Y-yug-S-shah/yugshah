// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config/site';
import mdx from '@astrojs/mdx';
import { loadEnv } from 'vite';

/** @returns {import('vite').Plugin} */
function devContactApiPlugin() {
  return {
    name: 'dev-contact-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/contact') || req.method !== 'POST') {
          return next();
        }

        const env = loadEnv('development', process.cwd(), '');
        let rawBody = '';
        req.on('data', (chunk) => {
          rawBody += chunk;
        });

        req.on('end', async () => {
          try {
            const body = JSON.parse(rawBody || '{}');
            const { name, email, subject, message, company_website } = body;

            // Honeypot check
            if (company_website) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Message sent successfully.' }));
              return;
            }

            if (!name || !email || !subject || !message) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Please complete all required fields.' }));
              return;
            }

            const apiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
            const from = env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'Portfolio Contact <onboarding@resend.dev>';
            const to = env.CONTACT_TO_EMAIL || process.env.CONTACT_TO_EMAIL || 'yugdshahcs@gmail.com';

            if (!apiKey) {
              res.statusCode = 503;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'RESEND_API_KEY is not configured in .env' }));
              return;
            }

            const escapeHtml = (/** @type {string} */ str) =>
              str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const resendRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from,
                to: [to],
                subject: `Portfolio contact: ${subject}`,
                reply_to: email,
                html: `
                  <h2>New portfolio message</h2>
                  <p><strong>Name:</strong> ${escapeHtml(name)}</p>
                  <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                  <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
                  <p><strong>Message:</strong></p>
                  <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
                `
              })
            });

            const resData = /** @type {{ message?: string }} */ (await resendRes.json().catch(() => ({})));

            if (!resendRes.ok) {
              res.statusCode = resendRes.status || 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: resData.message || 'Resend delivery failed.' }));
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Message sent successfully.' }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Internal Server Error' }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  vite: {
    plugins: [tailwindcss(), devContactApiPlugin()]
  },
  integrations: [react(), mdx(), sitemap({ filter: (page) => !page.includes('/404') })]
});