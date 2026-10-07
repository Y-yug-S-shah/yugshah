import { SITE_URL } from '../config/site';

export async function GET() {
  const items = [
    {
      title: 'Sample article placeholder',
      description: 'A placeholder post for the blog.',
      link: `${SITE_URL}/blog/sample-post`,
      pubDate: new Date('2026-10-01').toUTCString()
    }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Yug Shah</title>
      <link>${SITE_URL}</link>
      <description>Security notes and engineering updates from Yug Shah.</description>
      ${items
        .map(
          (item) => `
            <item>
              <title>${item.title}</title>
              <link>${item.link}</link>
              <description>${item.description}</description>
              <pubDate>${item.pubDate}</pubDate>
            </item>`
        )
        .join('')}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8'
    }
  });
}
