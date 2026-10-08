import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { completeQuest } from '../lib/gameState';

type TerminalLine = {
  id: string;
  kind: 'info' | 'output' | 'error' | 'command' | 'success' | 'warning';
  text: string;
};

type FileNode = {
  type: 'file' | 'dir';
  content?: string;
  children?: string[];
};

const virtualFs: Record<string, FileNode> = {
  '~': { type: 'dir', children: ['readme.txt', 'resume.txt', 'contact.txt', 'experience', 'projects', 'blog', 'skills'] },
  '~/readme.txt': {
    type: 'file',
    content: 'YUG SHAH // SECURITY ENGINEERING\n\nThis workspace covers security, networking, technical validation, and practical security tooling.\n\nBrowse: experience/  projects/  blog/  skills/\nTry: ls, tree, cat resume.txt, cat experience/palo-alto-networks.txt'
  },
  '~/resume.txt': {
    type: 'file',
    content:
      'Yug Shah — Security professional\n\n' +
      'SUMMARY\nSecurity professional with hands-on experience in technical validation, PoC delivery, and solution architecture across security and networking.\n\n' +
      'EXPERIENCE\nTechnical Solutions Intern · Palo Alto Networks · Mar 2026 – Oct 2026\nCustomer-facing solution design, demonstrations, POCs, troubleshooting, technical guidance, and cross-functional collaboration.\n\n' +
      'EDUCATION\nB.Tech, Computer Science · NMIMS · 2026\n\n' +
      'CERTIFICATIONS\nCompTIA Security+ (SY0-701) · PANW Security Operations · PANW Cloud Security · PANW Cybersecurity Practitioner · TryHackMe SOC Level 1'
  },
  '~/contact.txt': {
    type: 'file',
    content: 'Email: yugdshahcs@gmail.com\nLinkedIn: https://www.linkedin.com/in/yugshah369/\nGitHub: https://github.com/Y-yug-S-shah\nYouTube: https://www.youtube.com/@DefenderDiarybyYug'
  },
  '~/experience': { type: 'dir', children: ['palo-alto-networks.txt'] },
  '~/experience/palo-alto-networks.txt': {
    type: 'file',
    content:
      'PALO ALTO NETWORKS\nTechnical Solutions Intern · Mar 2026 – Oct 2026\n\n' +
      'Supported customer-facing solution design and implementation, identified technical challenges, and delivered solutions aligned with customer needs. Assisted with demonstrations, proofs of concept, troubleshooting, and technical guidance. Collaborated across teams on solution documentation, best practices, and support optimization.'
  },
  '~/projects': { type: 'dir', children: ['authguardian.txt', 'phishhound.txt'] },
  '~/projects/authguardian.txt': {
    type: 'file',
    content:
      'AUTHGUARDIAN · 2026\nBuilt Splunk queries to detect abnormal authentication behavior across login telemetry. Analyzed and correlated 100+ events, identifying failed-login spikes, unusual access patterns, and account misuse.\n\n' +
      'Stack: Splunk · Security analytics · Python\nRepository: https://github.com/Y-yug-S-shah/AuthGuardian'
  },
  '~/projects/phishhound.txt': {
    type: 'file',
    content:
      'PHISHHOUND · 2026\nPython CLI that analyzes email headers, validates SPF/DKIM/DMARC, and produces structured phishing indicators and IOCs.\n\n' +
      'Stack: Python · Email security · Threat analysis\nRepository: https://github.com/Y-yug-S-shah/phishhound'
  },
  '~/blog': { type: 'dir', children: ['ai-security-prompt-injection.mdx', 'agentic-identity.mdx', 'ai-agent-runtime-security.mdx', 'training-data-backdoors.mdx'] },
  '~/blog/ai-security-prompt-injection.mdx': {
    type: 'file',
    content: 'The #1 AI Security Risk in 2026 (Part 1 of a Complete Guide)\n\nPrompt injection, direct and indirect attacks, and the trust boundary around model instructions.\nhttps://medium.com/@yugdshahcs/ai-security-a-complete-guide-part-1-prompt-injection-26cd4825d791'
  },
  '~/blog/agentic-identity.mdx': {
    type: 'file',
    content: 'Agentic Identity Explained: What Happens When Your AI Agent Pretends to Be Someone Else?\n\nIdentity, authority, and the risks of agents acting on behalf of users.\nhttps://medium.com/@yugdshahcs/agentic-identity-explained-what-happens-when-your-ai-agent-pretends-to-be-someone-else-8c4c35a43f88'
  },
  '~/blog/ai-agent-runtime-security.mdx': {
    type: 'file',
    content: 'Your AI Agent is running right now, who’s watching it?\n\nRuntime discovery, observability, and policy enforcement for agents using tools.\nhttps://medium.com/@yugdshahcs/your-ai-agent-is-running-right-now-whos-watching-it-90fd27846a21'
  },
  '~/blog/training-data-backdoors.mdx': {
    type: 'file',
    content: 'The Invisible Backdoor: How Attackers Hijack AI Models Through Training Data\n\nData poisoning, backdoors in model weights, and the AI supply-chain attack surface.\nhttps://medium.com/@yugdshahcs/the-invisible-backdoor-how-attackers-hijack-ai-models-through-training-data-36323064c6da'
  },
  '~/skills': { type: 'dir', children: ['security-operations.txt', 'solutions-engineering.txt'] },
  '~/skills/security-operations.txt': {
    type: 'file',
    content: 'Threat hunting · Identity security · Network validation · SOC workflows · Splunk · SIEM · EDR/XDR · XSIAM · Prisma AIRS · Python · Web security'
  },
  '~/skills/solutions-engineering.txt': {
    type: 'file',
    content: 'Technical architecture · Security assessment · Product demonstrations · Proof-of-concept delivery · Customer problem diagnosis · Cross-functional collaboration · Stakeholder communication'
  }
};

const initialLines: TerminalLine[] = [
  { id: 'boot', kind: 'info', text: 'YUG.SH // SECURITY WORKSPACE' },
  { id: 'ready', kind: 'success', text: 'Session ready. Type `help` for commands or explore the workspace.' }
];

const buildAscii = `
  __   __  _   _   ____    ____  _   _   ____
  \\ \\ / / | | | | / ___|  / ___|| | | | |  _ \\
   \\ V /  | | | | \\___ \\ | |  _ | |_| | | | | |
    | |   | |_| |  ___) || |_| ||  _  | | |_| |
    |_|    \\___/  |____/  \\____||_| |_| |____/

  SECURITY  /  SIGNAL  /  SYSTEMS
  user: yug-shah       session: portfolio
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

function buildTree(path: string, depth = 0): string[] {
  const entry = virtualFs[path];
  if (entry?.type !== 'dir') return [];
  return (entry.children ?? []).flatMap((name, index, siblings) => {
    const last = index === siblings.length - 1;
    const childPath = path === '~' ? `~/${name}` : `${path}/${name}`;
    const child = virtualFs[childPath];
    const prefix = `${'  '.repeat(depth)}${last ? '└── ' : '├── '}${name}${child?.type === 'dir' ? '/' : ''}`;
    return [prefix, ...buildTree(childPath, depth + 1)];
  });
}

export default function CliTerminal() {
  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'cli');
  const [cwd, setCwd] = useState('~');
  const [history, setHistory] = useState<string[]>([]);
  const [output, setOutput] = useState<TerminalLine[]>(initialLines);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const [command, setCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const openHandler = () => setIsOpen(true);
    const closeHandler = () => setIsOpen(false);
    const syncFromLocation = () => setIsOpen(new URLSearchParams(window.location.search).get('mode') === 'cli');
    window.addEventListener('portfolio:open-cli', openHandler);
    window.addEventListener('portfolio:close-cli', closeHandler);
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

  const commands = useMemo(() => [
    'help', 'ls [path]', 'cd <dir>', 'pwd', 'tree', 'cat <file>', 'grep <term> <file>',
    'head [-n count] <file>', 'whoami', 'neofetch', 'open <page>', 'theme <light|dark>',
    'history', 'clear', 'echo <text>', 'date', 'sudo hire-me', 'exit'
  ], []);

  const appendOutput = (kind: TerminalLine['kind'], text: string) => {
    setOutput((current) => [...current, { id: `${Date.now()}-${Math.random()}`, kind, text }].slice(-160));
  };

  const executeCommand = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setHistory((current) => [...current, trimmed].slice(-60));
    appendOutput('command', `${cwd} $ ${trimmed}`);

    if (trimmed === 'help') {
      appendOutput('info', `COMMANDS\n${commands.join('   ·   ')}\n\nQUICK START\nls                    list this directory\ncat readme.txt        read the workspace guide\ncat resume.txt        read the resume\ncat experience/palo-alto-networks.txt\ncat blog/ai-agent-runtime-security.mdx`);
      return;
    }

    if (trimmed === 'whoami') {
      appendOutput('success', 'yug-shah · security professional · technical solutions');
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
      appendOutput('info', 'Screen cleared. Workspace session is still active.');
      return;
    }

    if (trimmed === 'history') {
      appendOutput('output', history.length ? history.map((item, index) => `${String(index + 1).padStart(2, '0')}  ${item}`).join('\n') : 'No commands in this session yet.');
      return;
    }

    if (trimmed === 'ls' || trimmed.startsWith('ls ')) {
      const target = trimmed.slice(2).trim().split(/\s+/).filter((part) => !part.startsWith('-')).join(' ') || cwd;
      const path = resolvePath(target, cwd);
      const entry = path ? virtualFs[path] : null;
      if (entry?.type === 'dir') {
        appendOutput('success', entry.children?.map((name) => virtualFs[path === '~' ? `~/${name}` : `${path}/${name}`]?.type === 'dir' ? `${name}/` : name).join('    ') ?? '');
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

    if (trimmed.startsWith('cd ') || trimmed === 'cd') {
      const target = trimmed.replace(/^cd\s*/, '').trim() || '~';
      const nextPath = resolvePath(target, cwd);
      if (nextPath && virtualFs[nextPath]?.type === 'dir') {
        setCwd(nextPath);
        appendOutput('success', `Changed directory to ${nextPath}`);
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
          if (path?.startsWith('~/blog/')) completeQuest('read-post');
        } else {
          appendOutput('error', `cat: ${target}: no such file`);
        }
      });
      return;
    }

    if (trimmed.startsWith('head ')) {
      const match = trimmed.match(/^head(?:\s+-n\s+(\d+))?\s+(.+)$/);
      const path = match ? resolvePath(match[2], cwd) : null;
      const entry = path ? virtualFs[path] : null;
      if (entry?.type !== 'file') {
        appendOutput('error', `head: ${match?.[2] ?? ''}: no such file`);
      } else {
        const count = Math.max(1, Math.min(100, Number(match?.[1] ?? 10)));
        appendOutput('output', (entry.content ?? '').split('\n').slice(0, count).join('\n'));
      }
      return;
    }

    if (trimmed.startsWith('grep ')) {
      const match = trimmed.match(/^grep(?:\s+-i)?\s+["']?(.+?)["']?\s+(\S+)$/);
      const path = match ? resolvePath(match[2], cwd) : null;
      const entry = path ? virtualFs[path] : null;
      if (!match || entry?.type !== 'file') {
        appendOutput('error', 'Usage: grep [-i] <term> <file>');
      } else {
        const insensitive = trimmed.startsWith('grep -i ');
        const lines = (entry.content ?? '').split('\n').filter((line) => insensitive
          ? line.toLowerCase().includes(match[1].toLowerCase())
          : line.includes(match[1]));
        appendOutput(lines.length ? 'success' : 'warning', lines.join('\n') || `No matches for "${match[1]}".`);
      }
      return;
    }

    if (trimmed === 'tree') {
      appendOutput('output', `~/\n${buildTree('~').join('\n')}`);
      return;
    }

    if (trimmed === 'neofetch') {
      appendOutput('info', buildAscii);
      return;
    }

    if (trimmed === 'exit') {
      window.dispatchEvent(new CustomEvent('portfolio:request-close-cli'));
      return;
    }

    if (trimmed === 'sudo hire-me') {
      appendOutput('success', 'Access granted. Open /contact to start a conversation about security engineering or technical validation.');
      completeQuest('send-message');
      return;
    }

    if (trimmed.startsWith('open ')) {
      const target = trimmed.replace(/^open\s+/, '');
      const route = target.startsWith('/') ? target : `/${target}`;
      if (!['/', '/resume', '/projects', '/blog', '/contact'].includes(route)) {
        appendOutput('error', `open: unknown route ${route}. Try /, /resume, /projects, /blog, or /contact.`);
        return;
      }
      completeQuest('explore-projects');
      window.location.href = route;
      return;
    }

    if (trimmed.startsWith('theme ')) {
      const theme = trimmed.replace(/^theme\s+/, '');
      if (theme !== 'dark' && theme !== 'light' && theme !== 'system') {
        appendOutput('error', 'Usage: theme <dark|light|system>');
        return;
      }
      const resolved = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.setAttribute('data-theme', resolved);
      localStorage.setItem('theme', resolved);
      appendOutput('success', `Theme set to ${resolved}.`);
      return;
    }

    appendOutput('error', `Command not found: ${trimmed}. Try 'help'.`);
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    executeCommand(command);
    setCommand('');
    setHistoryIndex(-1);
  };

  if (!isOpen) return null;

  return (
    <div id="cli-root" role="dialog" aria-modal="true" aria-label="Portfolio command line interface" className="cli-shell fixed inset-0 z-[100] text-slate-100">
      <div className="cli-frame mx-auto flex h-full max-w-[1500px] flex-col p-3 sm:p-5">
        <header className="cli-topbar">
          <div className="cli-window-lights" aria-hidden="true"><i /><i /><i /></div>
          <div className="cli-topbar-title"><strong>YUG.SH</strong><span>/</span> SECURITY WORKSPACE</div>
          <div className="cli-topbar-status"><i /> SESSION ACTIVE</div>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('portfolio:request-close-cli'))} className="cli-exit">EXIT <kbd>ESC</kbd></button>
        </header>

        <div className="cli-workspace">
          <aside className="cli-sidebar">
            <p className="cli-section-label">WORKSPACE</p>
            <p className="cli-path-label">~/</p>
            <div className="cli-file-tree">
              <button type="button" onClick={() => executeCommand('cat readme.txt')}><span className="cli-file-icon">▤</span> readme.txt</button>
              <button type="button" onClick={() => executeCommand('cat resume.txt')}><span className="cli-file-icon">▤</span> resume.txt</button>
              <button type="button" onClick={() => executeCommand('cat experience/palo-alto-networks.txt')}><span className="cli-dir-icon">▸</span> experience/</button>
              <button type="button" onClick={() => executeCommand('cat projects/authguardian.txt')}><span className="cli-dir-icon">▸</span> projects/</button>
              <button type="button" onClick={() => executeCommand('cat blog/ai-agent-runtime-security.mdx')}><span className="cli-dir-icon">▸</span> blog/</button>
              <button type="button" onClick={() => executeCommand('cat skills/security-operations.txt')}><span className="cli-dir-icon">▸</span> skills/</button>
            </div>
            <p className="cli-section-label cli-quick-label">QUICK COMMANDS</p>
            <div className="cli-quick-commands">
              {['ls', 'tree', 'whoami', 'help'].map((quickCommand) => (
                <button type="button" key={quickCommand} onClick={() => executeCommand(quickCommand)}>{quickCommand}</button>
              ))}
            </div>
            <div className="cli-sidebar-footer"><i /> INPUT READY <span>UTF-8</span></div>
          </aside>

          <section className="cli-console">
            <div className="cli-console-titlebar">
              <span><i /> interactive-shell</span>
              <span>zsh · portfolio</span>
            </div>
            <div ref={outputRef} className="cli-output" role="log" aria-live="polite" aria-relevant="additions">
              {output.map((line) => (
                <div key={line.id} className={`cli-line cli-line-${line.kind}`}>
                  <span className="cli-line-marker" aria-hidden="true">{line.kind === 'command' ? '›' : line.kind === 'error' ? '×' : line.kind === 'success' ? '✓' : line.kind === 'warning' ? '!' : '·'}</span>
                  <pre>{line.text}</pre>
                </div>
              ))}
              <form onSubmit={handleSubmit} className="cli-prompt">
                <label htmlFor="cli-command"><span>{cwd}</span><b>$</b></label>
                <input
                  id="cli-command"
                  ref={inputRef}
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  placeholder="Enter a command…"
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      executeCommand(command);
                      setCommand('');
                      setHistoryIndex(-1);
                    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
                      event.preventDefault();
                      executeCommand('clear');
                    } else if (event.key === 'ArrowUp') {
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
                <span className="cli-cursor" aria-hidden="true" />
                <button type="submit" className="cli-submit" aria-label="Run command">RUN ↵</button>
              </form>
            </div>
            <footer className="cli-console-footer"><span>↑↓ COMMAND HISTORY</span><span>CTRL L CLEAR</span><span>TYPE EXIT TO RETURN</span></footer>
          </section>

          <aside className="cli-intel">
            <p className="cli-section-label">PROFILE SIGNAL</p>
            <div className="cli-profile-card">
              <div className="cli-profile-emblem">YS<span>_</span></div>
              <strong>Yug Shah</strong>
              <span>Security professional</span>
              <a href="mailto:yugdshahcs@gmail.com">yugdshahcs@gmail.com ↗</a>
            </div>
            <p className="cli-section-label cli-quick-label">FOCUS AREAS</p>
            <div className="cli-signal-list">
              <span><i className="signal-cyan" /> Technical validation</span>
              <span><i className="signal-green" /> Security operations</span>
              <span><i className="signal-red" /> Threat analysis</span>
              <span><i className="signal-amber" /> AI security</span>
            </div>
            <p className="cli-section-label cli-quick-label">SHORTCUT</p>
            <button type="button" className="cli-shortcut" onClick={() => executeCommand('cat contact.txt')}>cat contact.txt <span>↗</span></button>
          </aside>
        </div>
      </div>
    </div>
  );
}
