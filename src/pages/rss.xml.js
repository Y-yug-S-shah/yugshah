import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_URL } from '../config/site';

export async function GET(context) {
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => new Date(b.data.pubDate).getTime() - new Date(a.data.pubDate).getTime());

  return rss({
    title: 'Yug Shah',
    description: 'Security notes and engineering thinking from Yug Shah.',
    site: context.site ?? SITE_URL,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags
    })),
    customData: '<language>en-us</language>'
  });
}
