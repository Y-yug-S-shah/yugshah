import { execFileSync } from 'node:child_process';
import { watch } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gitPath = process.env.GIT_EXECUTABLE || findGitExecutable();
const ignoredPath = /(^|\/)(\.git|node_modules|dist|\.astro)(\/|$)|(^|\/)\.env(?:$|\.)|^public\/og\//i;
const generatedPathspecs = [
  ':(exclude)public/resume.pdf',
  ':(exclude)public/og/**'
];
const debounceMs = 1800;
let debounceTimer;
let isPublishing = false;
let hasPendingChanges = false;

function findGitExecutable() {
  const candidates = [
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe'
  ];
  if (process.platform === 'win32') {
    return candidates.find((candidate) => {
      try {
        execFileSync(candidate, ['--version'], { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }) ?? 'git';
  }
  return 'git';
}

function git(args, options = {}) {
  return execFileSync(gitPath, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }).trim();
}

function checkSafeToPublish() {
  const branch = git(['branch', '--show-current']);
  if (branch !== 'main') {
    throw new Error(`Automatic publishing only runs on main; current branch is '${branch || 'detached HEAD'}'.`);
  }

  try {
    execFileSync(gitPath, ['check-ignore', '-q', '.env'], { cwd: projectRoot, stdio: 'ignore' });
  } catch {
    throw new Error('The local .env file is not ignored by Git; refusing to auto-publish until it is protected.');
  }
}

function publishChanges() {
  if (isPublishing) {
    hasPendingChanges = true;
    return;
  }

  isPublishing = true;
  try {
    checkSafeToPublish();
    git(['add', '-A', '--', '.', ...generatedPathspecs]);

    const stagedFiles = git(['diff', '--cached', '--name-only']);
    if (!stagedFiles) {
      return;
    }

    const stagedSecrets = stagedFiles
      .split(/\r?\n/)
      .filter((path) => /(^|\/)\.env(?:$|\.)/i.test(path));
    if (stagedSecrets.length > 0) {
      throw new Error(`Refusing to auto-publish staged environment files: ${stagedSecrets.join(', ')}`);
    }

    const message = `chore: auto-publish ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`;
    console.log(`Auto-publishing ${stagedFiles.split(/\r?\n/).length} changed file(s)...`);
    git(['commit', '-m', message], { stdio: 'inherit' });
    console.log('Commit created. The post-commit hook is pushing it to GitHub; Cloudflare Pages deploys from main.');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Automatic publish failed: ${detail}`);
    console.error('Review the issue and publish manually with git status, git add, git commit, and git push.');
  } finally {
    isPublishing = false;
    if (hasPendingChanges) {
      hasPendingChanges = false;
      schedulePublish();
    }
  }
}

function schedulePublish() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(publishChanges, debounceMs);
}

try {
  checkSafeToPublish();
  git(['config', 'core.hooksPath', '.githooks']);
} catch (error) {
  console.error(`Cannot start automatic publishing: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

console.log('Auto-publish watcher ready on main. Saving tracked project files will commit and push after a short pause.');
console.log('Secrets (.env*) and generated PDF/OG assets are excluded; Cloudflare Pages builds the deployment from each main push.');

const watcher = watch(projectRoot, { recursive: true }, (_eventType, filename) => {
  if (filename === null) {
    schedulePublish();
    return;
  }

  const path = filename.toString().split(sep).join('/');
  if (ignoredPath.test(path)) return;
  schedulePublish();
});

watcher.on('error', (error) => {
  console.error(`Auto-publish file watcher stopped: ${error.message}`);
  process.exitCode = 1;
});

const shutdown = () => {
  clearTimeout(debounceTimer);
  watcher.close();
  console.log('Auto-publish watcher stopped.');
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

setTimeout(publishChanges, debounceMs);
