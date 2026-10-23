## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Agent Instructions: Auto-Commit & Auto-Publish Policy

Whenever you make, modify, or finish editing files in this repository:
1. **Always Auto-Commit**: Never leave edits uncommitted at the end of a task or edit session. Stage the modified files with `git add` and commit them using a conventional commit message (e.g. `feat:`, `fix:`, `style:`, `refactor:`, `chore:`).
2. **Always Auto-Push to GitHub**: Immediately push the commit to `origin main` (`git push origin main`). Cloudflare Pages automatically detects pushes to `main` and deploys the live website.
3. **Windows Git Path**: If `git` is not available in the default shell PATH, use the full path: `C:\Program Files\Git\cmd\git.exe`.
4. **Pre-commit Verification**: Run `npm run build` or `npx astro check` before pushing to ensure zero regressions or broken types.
5. **Security**: Never commit `.env` files or secret tokens.
6. **Commercial Usability**: Always make sure all assets (music, audio, text, fonts, images) are commercially usable for free (permissive open-source licenses like MIT, OFL, CC0) as monetization will be added.
