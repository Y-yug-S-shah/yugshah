# SEO Checklist

This checklist covers the key steps for getting the portfolio site indexed and verified on search engines.

## 1. Verify the site is live

- Confirm the Astro build succeeds locally.
- Open the site and verify the HTML contains canonical URLs, meta descriptions, and JSON-LD markup.
- Ensure the sitemap and robots file are generated correctly.

## 2. Submit to Google Search Console

1. Open Google Search Console.
2. Add the site as a property using the Cloudflare Pages URL (for example `https://project-name.pages.dev`).
3. Verify ownership using one of the supported methods. DNS verification is usually the easiest option when using Cloudflare.
4. Submit the sitemap: `https://<project>.pages.dev/sitemap-index.xml`.
5. Request indexing for important pages such as `/`, `/resume`, `/projects`, and a representative blog post.

## 3. Submit to Bing Webmaster Tools

1. Open Bing Webmaster Tools and add the site.
2. Verify ownership through DNS, HTML tag, or Microsoft account verification.
3. Submit the sitemap at `https://<project>.pages.dev/sitemap-index.xml`.
4. Use the URL inspection tool to check key pages and confirm they are crawlable.

## 4. Validation checklist before launch

- `title` and `meta description` are unique on every page.
- Canonical URLs point to the production site URL.
- Open Graph and Twitter cards reference valid image files.
- Search engine bots can read content without JavaScript rendering.
- Blog posts include article markup, tags, and publish dates.
- Internal links connect key content areas.
- The site uses responsive markup and semantic heading structure.

## 5. Post-launch monitoring

- Check Search Console for indexing, crawl, and coverage issues.
- Review mobile usability and page experience reports.
- Watch for duplicate content or missing canonical tags.
- Iterate on content and internal linking as new project or article pages are added.

## 6. Useful commands

```bash
npm install
npm run build
npm run preview -- --host 0.0.0.0
```

This lets you verify the generated sitemap, OG images, and page metadata before deploying to Cloudflare Pages.
