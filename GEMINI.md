# Agent Rules: Auto-Commit & Auto-Publish

Whenever you make, modify, or finish editing files in this repository:
1. **Always Auto-Commit**: Never leave edits uncommitted at the end of a task or edit session. Stage the modified files with `git add` and commit them using a conventional commit message (e.g. `feat:`, `fix:`, `style:`, `refactor:`, `chore:`).
2. **Always Auto-Push to GitHub**: Immediately push the commit to `origin main` (`git push origin main`). Cloudflare Pages automatically detects pushes to `main` and deploys the live website.
3. **Windows Git Path**: If `git` is not available in the default shell PATH, use the full path: `C:\Program Files\Git\cmd\git.exe`.
4. **Pre-commit Verification**: Run `npm run build` or `npx astro check` in `portfolio-site` before pushing to ensure zero regressions or broken types.
5. **Security**: Never commit `.env` files or secret tokens.
