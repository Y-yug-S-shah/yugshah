# Cloudflare Pages Deployment Guide

This guide explains how to deploy the portfolio to Cloudflare Pages using the free-tier setup and keep the metadata pointed at the generated `.pages.dev` URL.

## 1. Push the project to GitHub

1. Create a GitHub repository for the portfolio site.
2. Commit and push the current source to the repository.
3. Ensure the repo contains the static site generator output and the Cloudflare Pages config files already added to the project.

## 2. Create the Cloudflare Pages project

1. Open Cloudflare Pages.
2. Click "Create a project" and choose the GitHub repository.
3. Select the repository and use the following settings:
   - Framework preset: None / Astro manual configuration
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `22`
4. Save the project and trigger the first deploy.

## 3. Configure environment variables

Add these environment variables in Cloudflare Pages > Settings > Environment variables:

- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret for contact validation.
- `RESEND_API_KEY` - Resend API key for the contact form.
- `RESEND_FROM_EMAIL` - Sender address on a domain verified with Resend.
- `CONTACT_TO_EMAIL` - The email address that should receive portfolio messages.
- `SITE_URL` - Set to the final Cloudflare Pages URL, currently `https://yugshah.pages.dev`.

How to obtain the free keys:

- Turnstile: create a Cloudflare account, open Zero Trust -> Turnstile, and create a site. Copy the secret key from the site details.
- Resend: create a free account, then generate an API key from the Resend dashboard.
- Contact email: use the approved public address or any account you want to receive the contact form submissions.

## 4. Create the D1 database and apply the schema

The static pages can deploy without D1. The shared game leaderboard requires it; without a D1 binding, scores remain unavailable.

To enable the leaderboard:

1. In Cloudflare Dashboard, open D1.
2. Create a database (for example, `portfolio-site-db`).
3. Open the new database and run all statements from `schema.sql` in its SQL editor.
4. In Cloudflare Pages, open Settings > Functions > D1 database bindings and add a binding named `DB` connected to that database.
5. Save and redeploy the Pages project.

Do not uncomment a Wrangler D1 configuration containing a placeholder or zero UUID. If you later configure Wrangler for local development or deploys, use the actual database name and ID from Cloudflare.

The leaderboard accepts only a nickname and score and retains the highest 100 submissions. It does not persist player email, accounts, or IP addresses. Submissions are client-reported and can be spoofed; this is a casual board, not a trusted competition.

## 5. Configure contact email delivery

Resend requires a verified sender domain. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (for example, `Portfolio <hello@your-verified-domain>`), and `CONTACT_TO_EMAIL` in Cloudflare Pages production variables, then redeploy. Never put API keys in source control. If email delivery is not configured, the form reports that delivery is unavailable instead of claiming the message was sent.

## 6. Update the site URL constant

The site metadata uses a single constant in `src/config/site.ts`:

```ts
export const SITE_URL = 'https://yugshah.pages.dev';
```

Update this value to match the final deployed Pages URL before final publishing. That value is used for:

- canonical URLs
- sitemap generation
- robots.txt
- OG image tags
- RSS links

## 7. Redeploy and verify the live site

After the environment variables and D1 binding are set:

1. Trigger a new deploy in Cloudflare Pages.
2. Open the `.pages.dev` URL and verify the home page, resume page, blog page, and contact page render.
3. Confirm the sitemap is generated and the robots file is served.
4. Test the contact form with the preview mode or production mode based on whether you have configured secrets.

## 8. Submit to search engines

### Google Search Console

1. Sign in to Google Search Console.
2. Add the Cloudflare Pages property using the `.pages.dev` URL.
3. Verify ownership using a supported method (for example DNS or another allowed verification step).
4. Submit the sitemap URL:

```text
https://<your-project>.pages.dev/sitemap-index.xml
```

5. Request indexing for the homepage and your most important pages.

### Bing Webmaster Tools

1. Open Bing Webmaster Tools.
2. Add the site and verify ownership.
3. Submit the sitemap URL to Bing.
4. Use the URL inspection tool to confirm the site is crawlable.

## 9. Move to a custom domain later

When you are ready for a custom domain:

1. In Cloudflare Pages, open the project and go to Custom domains.
2. Add the domain and follow the DNS instructions.
3. Update `SITE_URL` in `src/config/site.ts` to the custom domain URL.
4. Redeploy the site so the canonical URLs, sitemap, and OG tags all point at the custom domain.
5. Re-submit the updated sitemap to Google and Bing.

## 10. Final checks before launch

- All pages load with correct titles and canonical URLs.
- Contact form works with a verified Resend sender and the configured production variables.
- The game leaderboard loads and accepts scores after the `DB` D1 binding is enabled.
- Sitemap and robots files are reachable.
- Search Console and Bing Webmaster Tools both show the site as indexed or in the verification queue.
- No paid services are required for the current architecture's expected personal-portfolio usage; check provider limits as traffic grows.
