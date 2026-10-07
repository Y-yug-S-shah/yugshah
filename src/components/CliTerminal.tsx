import React, { useEffect, useMemo, useRef, useState } from 'react';
import { completeQuest } from '../lib/gameState';

type TerminalLine = {
  id: string;
  kind: 'info' | 'output' | 'error';
  text: string;
};

type FileNode = {
  type: 'file' | 'dir';
  content?: string;
  children?: string[];
};

const virtualFs: Record<string, FileNode> = {
  '~': { type: 'dir', children: ['about.txt', 'resume.txt', 'contact.txt', 'projects', 'blog'] },
  '~/about.txt': {
    type: 'file',
    content:
      'Security professional with hands-on experience in technical validation, PoC delivery, and solution architecture across security and networking.'
  },
  '~/resume.txt': {
    type: 'file',
    content:
      'Yug Shah\nSecurity Engineer\nPalo Alto Networks Technical Solutions Intern\nCompTIA Security+ | PANW Security Operations | Cloud Security | Cybersecurity Practitioner\n'
  },
  '~/contact.txt': {
    type: 'file',
    content: 'Email: yugdshahcs@gmail.com\nLinkedIn: https://www.linkedin.com/in/yugshah369/\nGitHub: https://github.com/Y-yug-S-shah\nYouTube: https://www.youtube.com/@DefenderDiarybyYug'
  },
  '~/projects': { type: 'dir', children: ['authguardian', 'phishhound'] },
  '~/projects/authguardian': {
    type: 'file',
    content:
      'Authguardian\nDetection logic for unusual authentication activity across login telemetry.\nTech: Splunk, security analytics, Python.'
  },
  '~/projects/phishhound': {
    type: 'file',
    content:
      'PhishHound\nPython CLI for validating email header signals and surfacing phishing indicators.\nTech: Python, email security, threat hunting.'
  },
  '~/blog': { type: 'dir', children: ['sample-security-post.mdx', 'sample-networking-post.mdx'] },
  '~/blog/sample-security-post.mdx': {
    type: 'file',
    content: 'Security note: prioritize telemetry, evidence, and clear customer guidance before building a detection.'
  },
  '~/blog/sample-networking-post.mdx': {
    type: 'file',
    content: 'Networking note: resilient systems are often boring in the best way; they document behavior, fail gracefully, and recover predictably.'
  }
};

const initialLines: TerminalLine[] = [
  { id: 'boot', kind: 'info', text: 'Booting yug.sh profile...' },
  { id: 'ready', kind: 'info', text: 'Type `help` to list commands.' }
];

const buildAscii = `
        _   _   _      __        __
       | | | | | |     \ \      / /
       | |_| | |_| | ___\ \ /\ / /___  _ __
       |  _  | __| |/ _ \\ V  V // _ \| '__|
       | | | | |_| |  __/\_/\_/\ __/| |
       |_| |_|\__|_|\___|     |_|\___||_|

       uname: yug-shah
       role: security engineer
       status: online
`;

function normalizePath(input: string, cwd: string) {
  const value = input.trim().replace(/\\/g, '/');
  if (!value || value === '.') return cwd;
  const target = value.startsWith('~')
    ? value
    : value.startsWith('/')
      ? `~${value}`
      : `${cwd}/${value}`;
  const segments: string[] = [];

  for (const segment of target.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (segments.length > 1) segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join('/') || '~';
}

function resolvePath(input: string, cwd: string) {
  const path = normalizePath(input, cwd);
  return path in virtualFs ? path : null;
}

export default function CliTerminal() {
  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'cli');
  const [cwd, setCwd] = useState('~');
  const [history, setHistory] = useState<string[]>([
    'help',
    'ls',
    'whoami',
    'neofetch'
  ]);
  const [output, setOutput] = useState<TerminalLine[]>(initialLines);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const [command, setCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    const closeHandler = () => setIsOpen(false);
    window.addEventListener('portfolio:open-cli', openHandler);
    window.addEventListener('portfolio:close-cli', closeHandler);

    const syncFromLocation = () => setIsOpen(new URLSearchParams(window.location.search).get('mode') === 'cli');
    window.addEventListener('popstate', syncFromLocation);

    return () => {
      window.removeEventListener('portfolio:open-cli', openHandler);
      window.removeEventListener('portfolio:close-cli', closeHandler);
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('cli-active', isOpen);
    const previousOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      inputRef.current?.focus();
    }

    return () => {
      document.documentElement.classList.remove('cli-active');
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' });
  }, [output]);

  const commands = useMemo(() => ['help', 'ls [path]', 'cd [path]', 'pwd', 'tree', 'cat <file>', 'whoami', 'neofetch', 'open <page>', 'theme <light|dark|system>', 'history', 'clear', 'echo <text>', 'date', 'sudo hire-me', 'exit'], []);

  const appendOutput = (kind: TerminalLine['kind'], text: string) => {
    setOutput((current) => [...current, { id: `${Date.now()}-${Math.random()}`, kind, text }]);
  };

  const executeCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const nextHistory = [...history, trimmed];
    setHistory(nextHistory);

    if (trimmed === 'help') {
      appendOutput('output', `Available commands: ${commands.join(', ')}`);
      return;
    }

    if (trimmed === 'whoami') {
      appendOutput('output', 'yug');
      return;
    }

    if (trimmed === 'pwd') {
      appendOutput('output', cwd);
      return;
    }

    if (trimmed === 'date') {
      appendOutput('output', new Date().toString());
      return;
    }

    if (trimmed === 'clear' || trimmed === 'Ctrl+L') {
      setOutput([]);
      appendOutput('info', 'Screen cleared.');
      return;
    }

    if (trimmed === 'history') {
      appendOutput('output', nextHistory.join('\n'));
      return;
    }

    if (trimmed === 'ls' || trimmed.startsWith('ls ')) {
      const target = trimmed.slice(2).trim().split(/\s+/).filter((part) => !part.startsWith('-')).join(' ') || cwd;
      const path = resolvePath(target, cwd);
      const entry = path ? virtualFs[path] : null;
      if (entry?.type === 'dir') {
        appendOutput('output', entry.children?.join('  ') ?? '');
      } else if (entry?.type === 'file') {
        appendOutput('output', path?.split('/').at(-1) ?? '');
      } else {
        appendOutput('error', `ls: cannot access '${target}': no such file or directory`);
      }
      return;
    }

    if (trimmed.startsWith('echo ')) {
      appendOutput('output', trimmed.replace(/^echo\s+/, ''));
      return;
    }

    if (trimmed.startsWith('cd ')) {
      const target = trimmed.replace(/^cd\s+/, '').trim() || '~';
      const nextPath = resolvePath(target, cwd);
      if (nextPath && nextPath in virtualFs && virtualFs[nextPath]?.type === 'dir') {
        setCwd(nextPath);
        appendOutput('output', `Changed directory to ${nextPath}`);
        return;
      }
      appendOutput('error', `cd: no such directory: ${target}`);
      return;
    }

    if (trimmed.startsWith('cat ')) {
      const targets = trimmed.replace(/^cat\s+(?:--\s+)?/, '').trim().split(/\s+/).filter(Boolean);
      if (!targets.length) {
        appendOutput('error', 'cat: provide a file name');
        return;
      }
      targets.forEach((target) => {
        const path = resolvePath(target, cwd);
        const entry = path ? virtualFs[path] : null;
        if (entry?.type === 'file') {
          appendOutput('output', entry.content ?? '');
          completeQuest('read-post');
        } else {
          appendOutput('error', `cat: ${target}: no such file`);
        }
      });
      return;
    }

    if (trimmed === 'tree') {
      appendOutput('output', '~/\n├── about.txt\n├── resume.txt\n├── contact.txt\n├── projects/\n│   ├── authguardian\n│   └── phishhound\n└── blog/\n    ├── sample-security-post.mdx\n    └── sample-networking-post.mdx');
      return;
    }

    if (trimmed === 'neofetch') {
      appendOutput('output', buildAscii);
      return;
    }

    if (trimmed === 'exit') {
      window.dispatchEvent(new CustomEvent('portfolio:request-close-cli'));
      return;
    }

    if (trimmed === 'sudo hire-me') {
      appendOutput('output', 'Access granted. I am open to conversations about security engineering and technical validation.');
      completeQuest('send-message');
      return;
    }

    if (trimmed.startsWith('open ')) {
      const target = trimmed.replace(/^open\s+/, '');
      const route = target.startsWith('/') ? target : `/${target}`;
      window.location.href = route;
      completeQuest('explore-projects');
      appendOutput('output', `Opening ${route}`);
      return;
    }

    if (trimmed.startsWith('theme ')) {
      const theme = trimmed.replace(/^theme\s+/, '');
      const next = theme === 'dark' || theme === 'light' || theme === 'system' ? theme : 'dark';
      const root = document.documentElement;
      root.setAttribute('data-theme', next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next);
      localStorage.setItem('theme', next === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : next);
      appendOutput('output', `Theme set to ${next}.`);
      return;
    }

    appendOutput('error', `Command not found: ${trimmed}. Try 'help'.`);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    executeCommand(command);
    setCommand('');
    setHistoryIndex(-1);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div id="cli-root" role="dialog" aria-modal="true" aria-label="Portfolio command line interface" className="fixed inset-0 z-[100] bg-[#050a12] text-slate-100">
      <div className="mx-auto flex h-full max-w-6xl flex-col p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between rounded-t-2xl border border-cyan-900/60 bg-slate-900/90 px-4 py-3 font-mono text-xs uppercase tracking-[0.22em] text-cyan-200">
          <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Yug Shah // interactive terminal</span>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('portfolio:request-close-cli'))} className="rounded-full border border-slate-700 px-3 py-1 text-[10px] hover:border-cyan-400 hover:text-cyan-200">Exit (Esc)</button>
        </div>

        <div className="flex-1 overflow-hidden rounded-b-2xl border border-cyan-950 bg-[radial-gradient(ellipse_at_top_left,rgba(8,47,73,0.45),transparent_45%),#080e18] shadow-2xl shadow-cyan-950/30">
          <div ref={outputRef} className="h-full overflow-y-auto p-4 font-mono text-sm sm:p-6">
            <div className="space-y-3">
              {output.map((line) => (
                <div key={line.id} className={`whitespace-pre-wrap leading-relaxed ${line.kind === 'error' ? 'text-rose-300' : line.kind === 'info' ? 'text-cyan-300' : 'text-slate-100'}`}>
                  {line.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
              <span className="text-cyan-400">{cwd}$</span>
              <input
                ref={inputRef}
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                className="w-full border-0 bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="try ls, cat about.txt, help, or exit"
                aria-label="Terminal command input"
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    const nextIndex = Math.min(history.length - 1, historyIndex + 1);
                    setHistoryIndex(nextIndex);
                    setCommand(history[history.length - 1 - nextIndex] ?? '');
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    const nextIndex = Math.max(-1, historyIndex - 1);
                    setHistoryIndex(nextIndex);
                    setCommand(nextIndex < 0 ? '' : history[history.length - 1 - nextIndex] ?? '');
                  }
                }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
