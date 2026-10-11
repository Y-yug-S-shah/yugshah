# Yug Shah Portfolio

A static portfolio site for Yug Shah built with Astro, Tailwind, React islands, Cloudflare Pages compatibility, an animated AI-security network, and a playable Milo mission.

## Stack

- Astro static site with React islands
- Tailwind CSS, CSS custom properties, and liquid-glass surfaces
- A lightweight Canvas 2D AI-security network animation shared across desktop and mobile
- A shared page-edge frame, richer cross-theme accent colors, and descriptive hover-highlighted AI-security focus cards
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
- Add frontmatter for `title`, `description`, `pubDate`, and `tags`, then write the article in the MDX body. `cover` and `mediumUrl` are optional; when a Medium original exists, its URL appears on both the blog card and local article page.

## Environment variables

Copy `.env.example` to a local environment file before testing contact or Turnstile features.

```bash
cp .env.example .env
```

Required variables:

- `TURNSTILE_SECRET_KEY` – Cloudflare Turnstile secret key for production validation.
- `RESEND_API_KEY` – Resend API key for sending contact emails.
- `RESEND_FROM_EMAIL` – A sender address on a domain verified with Resend.
- `CONTACT_TO_EMAIL` – Email address that receives portfolio messages.

## Cloudflare Pages setup

1. Create a Pages project and connect the GitHub repo.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Choose Node 22 in the Pages environment settings.
5. Add the production environment variables listed above. Resend must have verified the domain used by `RESEND_FROM_EMAIL`.
6. To enable the shared game leaderboard, create a Cloudflare D1 database, run `schema.sql`, and add it as a Pages D1 binding named `DB`.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the full production deployment checklist, D1 setup, custom-domain steps, and search-engine submission instructions.

## D1 schema

The included `schema.sql` creates the site tables and the `ai_mission_scores` table used by the shared game leaderboard. Without a `DB` binding, the static site still deploys, but leaderboard reads and submissions are unavailable. The leaderboard stores only the chosen nickname and score; it does not store player email, account, or IP address. Scores are client-reported and cannot be cryptographically verified as legitimate play.

## Accessibility notes

- Skip links, visible focus states, and reduced-motion support are included.
- Forms use semantic labels and live status messages.
- Content remains readable and crawlable without JavaScript-required features.
- The AI-security network animation uses Canvas 2D, adapts to the viewport, pauses in background tabs, and becomes a static illustration when reduced motion is requested.
- Milo, the AI companion, stays in a dedicated desktop sidebar and follows page progress without covering content.
- Blog and project illustrations are locally authored SVG diagrams. The game and ambient/click sounds are generated with Canvas and Web Audio APIs; they do not fetch third-party artwork or audio.
- The ambient piano chords and short click/clack sounds are synthesized in the browser; audio remains off until enabled with the Sound control.

## Font licenses

The locally bundled Manrope Variable and Fraunces Variable fonts are distributed under the SIL Open Font License 1.1. Their license texts are included in `public/licenses/`. OFL fonts may be used on a commercial site; the fonts themselves cannot be sold as standalone products.

## Asset licensing

Site visuals are intended for commercial use of this portfolio:

- Project and blog images in `public/media/` are original SVG diagrams authored for this site.
- The favicon, placeholder artwork, and generated OG images are original.
- Game graphics are drawn in Canvas at runtime; they are not third-party sprites.
- Ambient piano and click sounds are synthesized in the browser with the Web Audio API; no recorded samples are bundled.
- No stock photography, icon packs, or third-party audio files are included.
- The latest four articles in the AI security series are mirrored in full, with a direct Medium source link on each listing card and article page. Their optimized covers and diagrams are served from `public/media/`.
- The separate `/game` page is a keyboard- and touch-controlled AI-security mission starring Milo. Guide the agent through a runtime, collect its trust policies, evade an injected payload, and secure the tool gateway.
- CLI mode includes a browsable portfolio workspace, real project and experience summaries, article links, shell-style commands, command history, and animated terminal output. It supports `ls`, `cat`, `cd`, `grep`, `open`, and other shell-inspired commands.

## Publishing workflow

Cloudflare Pages deploys the connected `main` branch after each successful push. The VS Code task **Portfolio: auto-commit and publish on save** starts when this project folder opens. After a short pause following a save, it commits project changes; the Git post-commit hook pushes the commit to GitHub, which triggers the Pages deployment.

If VS Code asks, allow automatic tasks for this folder. The watcher runs only on `main`, excludes `.env*` files and generated resume/OG assets, and reports errors in its task terminal. If automatic publishing fails, review the message and use Source Control or `git status` to resolve the issue. To start it manually, run `npm run auto-publish`.

Auto-publishing makes saved code live without waiting for a manual commit, so review changes regularly. Add blog posts as `.mdx` files under `src/content/blog/`; saving a post while the watcher is running publishes it and triggers the normal deployment workflow.

## SEO and analytics

This project includes sitemap generation, robots.txt output, and generated OG images. More details are stored in `docs/SEO-CHECKLIST.md`.
