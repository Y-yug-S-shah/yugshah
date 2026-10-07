import React, { useEffect, useMemo, useRef, useState } from 'react';
import { completeQuest, getGameState } from '../lib/gameState';

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
  const value = input.trim();
  if (!value || value === '.') return cwd;
  const next = value.replace(/^~\//, '~').replace(/^~$/, '~');
  if (next.startsWith('/')) return next;
  return `${cwd.replace(/\/$/, '')}/${next}`.replace(/\/+/g, '/');
}

const hasPrefix = (target: string, prefix: string) => target === prefix || target.startsWith(`${prefix}/`);

function resolvePath(input: string, cwd: string) {
  const raw = normalizePath(input, cwd).replace(/\/+/g, '/');
  const candidates = [raw, raw.startsWith('~') ? raw.replace(/^~/, '~') : `~${raw}`];
  for (const candidate of candidates) {
    if (candidate in virtualFs) return candidate;
  }
  if (raw === '~') return '~';
  return null;
}

export default function CliTerminal() {
  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && window.location.search.includes('mode=cli'));
  const [cwd, setCwd] = useState('~');
  const [history, setHistory] = useState<string[]>([
    'help',
    'ls',
    'whoami',
    'neofetch'
  ]);
  const [output, setOutput] = useState<TerminalLine[]>(initialLines);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [command, setCommand] = useState('');
  const [snake, setSnake] = useState<Array<{ x: number; y: number }>>([
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 4 }
  ]);
  const [food, setFood] = useState({ x: 6, y: 4 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [snakeOpen, setSnakeOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    const closeHandler = () => setIsOpen(false);
    window.addEventListener('portfolio:open-cli', openHandler);
    window.addEventListener('portfolio:close-cli', closeHandler);

    const query = new URLSearchParams(window.location.search);
    if (query.get('mode') === 'cli') {
      setIsOpen(true);
    }

    return () => {
      window.removeEventListener('portfolio:open-cli', openHandler);
      window.removeEventListener('portfolio:close-cli', closeHandler);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '`') {
        setIsOpen((current) => !current);
      }
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      inputRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!snakeOpen) return;

    const timer = window.setInterval(() => {
      setSnake((currentSnake) => {
        const nextHead = {
          x: currentSnake[0].x + direction.x,
          y: currentSnake[0].y + direction.y
        };

        const next = [nextHead, ...currentSnake];
        if (nextHead.x === food.x && nextHead.y === food.y) {
          setFood({
            x: 1 + Math.floor(Math.random() * 8),
            y: 1 + Math.floor(Math.random() * 8)
          });
        } else {
          next.pop();
        }

        return next;
      });
    }, 220);

    return () => window.clearInterval(timer);
  }, [snakeOpen, direction, food.x, food.y]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!snakeOpen) return;
      const map: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }
      };
      if (map[event.key]) {
        setDirection(map[event.key]);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snakeOpen]);

  const commands = useMemo(() => ['help', 'ls', 'cd', 'pwd', 'tree', 'cat', 'whoami', 'neofetch', 'open', 'theme', 'history', 'clear', 'echo', 'date', 'sudo hire-me', 'play snake', 'exit'], []);

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

    if (trimmed === 'ls') {
      const current = virtualFs[cwd] ?? virtualFs['~'];
      appendOutput('output', current.children?.join('  ') ?? '');
      return;
    }

    if (trimmed.startsWith('echo ')) {
      appendOutput('output', trimmed.replace(/^echo\s+/, ''));
      return;
    }

    if (trimmed.startsWith('cd ')) {
      const target = trimmed.replace(/^cd\s+/, '');
      if (target === '..' || target === '../') {
        setCwd('~');
        appendOutput('output', 'Moved to ~');
        return;
      }
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
      const target = trimmed.replace(/^cat\s+/, '');
      const path = resolvePath(target, cwd);
      const entry = path ? virtualFs[path] : null;
      if (entry?.type === 'file') {
        appendOutput('output', entry.content ?? '');
        completeQuest('read-post');
        return;
      }
      appendOutput('error', `cat: ${target}: no such file`);
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

    if (trimmed === 'play snake') {
      setSnakeOpen(true);
      appendOutput('output', 'Snake loaded. Use arrow keys to move and avoid walls.');
      return;
    }

    if (trimmed === 'exit') {
      setIsOpen(false);
      appendOutput('output', 'Exiting CLI mode.');
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
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/95 text-slate-100 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-6xl flex-col p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between rounded-t-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs uppercase tracking-[0.22em] text-slate-300">
          <span>Portfolio CLI</span>
          <button type="button" onClick={() => setIsOpen(false)} className="rounded-full border border-slate-700 px-2 py-1 text-[10px]">Close</button>
        </div>

        <div className="flex-1 overflow-hidden rounded-b-2xl border border-slate-700 bg-[#0b1220] shadow-2xl shadow-slate-950/60">
          <div className="h-full overflow-y-auto p-4 font-mono text-sm sm:p-6">
            <div className="space-y-3">
              {output.map((line) => (
                <div key={line.id} className={line.kind === 'error' ? 'text-rose-300' : line.kind === 'info' ? 'text-cyan-300' : 'text-slate-100'}>
                  {line.text}
                </div>
              ))}
            </div>

            {snakeOpen && (
              <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-300">
                  <span>snake</span>
                  <button type="button" onClick={() => setSnakeOpen(false)} className="rounded-full border border-slate-700 px-2 py-1 text-[10px]">Quit</button>
                </div>
                <div className="grid w-full max-w-[18rem] grid-cols-10 gap-1 rounded-lg bg-slate-950 p-2">
                  {Array.from({ length: 10 }).map((_, rowIndex) =>
                    Array.from({ length: 10 }).map((__, colIndex) => {
                      const isHead = snake[0]?.x === colIndex && snake[0]?.y === rowIndex;
                      const isBody = snake.some((segment) => segment.x === colIndex && segment.y === rowIndex);
                      const isFood = food.x === colIndex && food.y === rowIndex;
                      const cellClass = isHead ? 'bg-emerald-400' : isBody ? 'bg-cyan-400' : isFood ? 'bg-amber-400' : 'bg-slate-800';
                      return <div key={`${rowIndex}-${colIndex}`} className={`h-4 w-4 rounded-sm ${cellClass}`} />;
                    })
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
              <span className="text-cyan-400">{cwd}$</span>
              <input
                ref={inputRef}
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                className="w-full border-0 bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="type a command"
                aria-label="Terminal command input"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
