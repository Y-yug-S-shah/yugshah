import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const publicOgDir = path.join(rootDir, 'public', 'og');
const projectsPath = path.join(rootDir, 'src', 'data', 'projects.json');
const postsDir = path.join(rootDir, 'src', 'content', 'blog');

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const wrapLines = (text, maxChars = 22) => {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.slice(0, 2);
};

const makeSvg = ({ title, subtitle, label = 'Portfolio' }) => {
  const lines = wrapLines(title);
  const titleLines = lines.length > 0 ? lines : ['Portfolio'];
  const titleMarkup = titleLines
    .map((line, index) => `
    <tspan x="80" dy="${index === 0 ? 0 : 52}">${escapeXml(line)}</tspan>`)
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
      <title id="title">${escapeXml(title)}</title>
      <desc id="desc">${escapeXml(subtitle)}</desc>
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1020" />
          <stop offset="50%" stop-color="#101b2b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7dd3fc" />
          <stop offset="100%" stop-color="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" rx="32" />
      <circle cx="1060" cy="90" r="200" fill="rgba(125, 211, 252, 0.12)" />
      <circle cx="920" cy="500" r="220" fill="rgba(167, 139, 250, 0.14)" />
      <rect x="60" y="60" width="180" height="42" rx="21" fill="rgba(148,163,184,0.18)" />
      <text x="92" y="88" fill="#dbeafe" font-size="20" font-family="Segoe UI, Arial, sans-serif" letter-spacing="3">${escapeXml(label.toUpperCase())}</text>
      <text x="80" y="170" fill="#7dd3fc" font-size="26" font-family="Segoe UI, Arial, sans-serif" letter-spacing="5">YUG SHAH</text>
      <text x="80" y="280" fill="#f8fafc" font-size="64" font-family="Segoe UI, Arial, sans-serif" font-weight="700">
        ${titleMarkup}
      </text>
      <rect x="80" y="490" width="340" height="2" fill="url(#accent)" />
      <text x="80" y="530" fill="#cbd5e1" font-size="28" font-family="Segoe UI, Arial, sans-serif">${escapeXml(subtitle)}</text>
    </svg>
  `;
};

const ensureOutputDir = async () => {
  await mkdir(publicOgDir, { recursive: true });
};

const writeSvg = async (relativePath, svg) => {
  await writeFile(path.join(rootDir, 'public', relativePath), svg, 'utf8');
};

const projects = JSON.parse(await readFile(projectsPath, 'utf8'));

const files = [];
files.push({ path: 'og/home.svg', svg: makeSvg({ title: 'Engineering secure systems and practical trust', subtitle: 'Security • networking • resilient architecture', label: 'Home' }) });
files.push({ path: 'og/resume.svg', svg: makeSvg({ title: 'Resume', subtitle: 'Security professional and technical validator', label: 'Resume' }) });
files.push({ path: 'og/projects.svg', svg: makeSvg({ title: 'Selected projects', subtitle: 'Security research, engineering and delivery', label: 'Projects' }) });

for (const project of projects) {
  files.push({
    path: `og/project-${project.slug}.svg`,
    svg: makeSvg({
      title: project.title,
      subtitle: project.summary,
      label: 'Project'
    })
  });
}

const blogFiles = await readdir(postsDir);
for (const file of blogFiles) {
  if (!file.endsWith('.mdx')) continue;
  const fullPath = path.join(postsDir, file);
  const content = await readFile(fullPath, 'utf8');
  const titleMatch = content.match(/^---\s*[\s\S]*?title:\s*['"]?([^\n'"\r]+)['"]?\s*\n/m);
  const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.mdx$/, '');
  const tagMatch = content.match(/^---\s*[\s\S]*?tags:\s*\[([^\]]*)\]/m);
  const subtitle = tagMatch ? `Blog • ${tagMatch[1].replace(/['"]/g, '').replace(/\s+/g, ' ')}` : 'Blog note';
  files.push({
    path: `og/blog-${file.replace(/\.mdx$/, '')}.svg`,
    svg: makeSvg({ title, subtitle, label: 'Blog' })
  });
}

await ensureOutputDir();
for (const file of files) {
  await writeSvg(file.path, file.svg);
}

console.log(`Generated ${files.length} OG images in ${publicOgDir}`);
