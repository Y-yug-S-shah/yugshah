# Yug Shah Portfolio

A static portfolio site for Yug Shah built with Astro, Tailwind, React islands, Cloudflare Pages compatibility, and a lightweight gamified UX.

## Stack

- Astro static site with React islands
- Tailwind CSS and CSS custom properties
- MDX blog content collection
- Cloudflare Pages Functions for contact handling
- Build-time resume PDF export and OG image generation

## Local development

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4321
```

## Production build

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4321
```

## Project structure

```text
/
├── docs/
│   └── SEO-CHECKLIST.md
├── functions/
│   └── api/
├── public/
│   ├── media/
│   ├── og/
│   └── resume.pdf
├── scripts/
│   ├── build-resume-pdf.mjs
│   └── generate-og-images.mjs
├── src/
│   ├── components/
│   ├── content/
│   ├── data/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── .env.example
├── astro.config.mjs
├── README.md
├── schema.sql
├── wrangler.toml
└── package.json
```

## Content updates

### Update the profile and resume

- Edit `src/data/profile.json` for name, bio, social links, and public profile metadata.
- Edit `src/data/resume.json` for work, education, certifications, and skills.
- Rebuild to refresh the PDF and page render.

### Add a new project

- Add an entry in `src/data/projects.json`.
- Each project will generate a detail page automatically during the build.

### Add a blog post

- Create a new `.mdx` file under `src/content/blog/`.
- Include frontmatter such as `title`, `description`, `pubDate`, `tags`, and optional `cover` or `mediumUrl`. When a Medium original exists, its URL appears on both the blog card and the local article page.

## Environment variables

Copy `.env.example` to a local environment file before testing contact or Turnstile features.

```bash
cp .env.example .env
```

Required variables:

- `TURNSTILE_SECRET_KEY` – Cloudflare Turnstile secret key for production validation.
- `RESEND_API_KEY` – Resend API key for sending contact emails.
- `CONTACT_TO_EMAIL` – Email address that receives portfolio messages.

## Cloudflare Pages setup

1. Create a Pages project and connect the GitHub repo.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Choose Node 22 in the Pages environment settings.
5. Add the environment variables listed above.
6. For D1, create a database and apply `schema.sql`.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full production deployment checklist, D1 setup, custom-domain steps, and search-engine submission instructions.

## D1 schema

The included `schema.sql` creates basic tables for statistics and guestbook-style interactions. Update the schema as features expand.

## Accessibility notes

- Skip links, visible focus states, and reduced-motion support are included.
- Forms use semantic labels and live status messages.
- Content remains readable and crawlable without JavaScript-required features.
- The animated woodland background and fox companion use locally hosted, optimized assets. The woodland photo is by David Dixon / Geograph, licensed CC BY-SA 2.0; its attribution and license are linked beside the photo in the game.
- Project cards use screenshots from the corresponding public AuthGuardian and PhishHound repositories.
- The ambient piano chords and short click/clack sounds are synthesized in the browser; audio remains off until enabled with the Sound control.
- The home page has a small, immediately playable woodland fox trail. The three landmarks are available without visiting other pages; arrow keys, WASD, touch controls, and nearby map patches work.
- The background and fox motion are CSS-based, with reduced-motion preferences respected. The previous continuously redrawn particle canvas has been removed.

## Publishing workflow

Cloudflare Pages deploys the connected `main` branch after each successful push. The VS Code task **Portfolio: auto-commit and publish on save** starts when this project folder opens. After a short pause following a save, it commits project changes; the Git post-commit hook pushes the commit to GitHub, which triggers the Pages deployment.

If VS Code asks, allow automatic tasks for this folder. The watcher runs only on `main`, excludes `.env*` files and generated resume/OG assets, and reports errors in its task terminal. If automatic publishing fails, review the message and use Source Control or `git status` to resolve the issue. To start it manually, run `npm run auto-publish`.

Auto-publishing makes saved code live without waiting for a manual commit, so review changes regularly. Add blog posts as `.mdx` files under `src/content/blog/`; saving a post while the watcher is running publishes it and triggers the normal deployment workflow.

## SEO and analytics

This project includes sitemap generation, robots.txt output, and generated OG images. More details are stored in `docs/SEO-CHECKLIST.md`.
