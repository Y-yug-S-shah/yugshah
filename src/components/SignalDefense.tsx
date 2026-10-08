import { useCallback, useEffect, useState } from 'react';

type Incident = {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  signal: string;
  clue: string;
  target: string;
};

const nodes = [
  { id: 'identity', label: 'Identity', detail: 'IdP · SSO' },
  { id: 'endpoint', label: 'Endpoint', detail: 'EDR · host' },
  { id: 'gateway', label: 'Gateway', detail: 'Network · edge' },
  { id: 'cloud', label: 'Cloud data', detail: 'SaaS · storage' }
];

const incidents: Incident[] = [
  {
    id: 'identity',
    severity: 'critical',
    signal: 'Privileged sign-in from an unseen device',
    clue: 'MFA was approved from a new device, followed by a role change minutes later.',
    target: 'identity'
  },
  {
    id: 'endpoint',
    severity: 'high',
    signal: 'Workstation beaconing to an unknown host',
    clue: 'The outbound connection starts from one laptop and repeats at fixed intervals.',
    target: 'endpoint'
  },
  {
    id: 'cloud',
    severity: 'critical',
    signal: 'Unusual bulk export from a service account',
    clue: 'A deployment token accessed far more records than its normal workload requires.',
    target: 'cloud'
  }
];

export default function SignalDefense() {
  const [incidentIndex, setIncidentIndex] = useState(0);
  const [contained, setContained] = useState(false);
  const [message, setMessage] = useState('Review the telemetry, then isolate the most likely compromised layer.');
  const [score, setScore] = useState(0);
  const incident = incidents[incidentIndex];
  const complete = incidentIndex === incidents.length - 1 && contained;

  const isolate = useCallback((nodeId: string) => {
    if (contained) return;
    if (nodeId === incident.target) {
      setContained(true);
      setScore((current) => current + 1);
      setMessage('Signal contained. The evidence supports isolating this layer.');
      return;
    }
    setMessage('Not enough evidence for that layer. Re-read the alert and trace its source.');
  }, [contained, incident]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)
      )) return;
      if (!/^[1-4]$/.test(event.key) || complete) return;
      event.preventDefault();
      isolate(nodes[Number(event.key) - 1].id);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [complete, isolate]);

  const nextIncident = () => {
    if (complete) {
      setIncidentIndex(0);
      setContained(false);
      setScore(0);
      setMessage('Review the telemetry, then isolate the most likely compromised layer.');
      return;
    }
    setIncidentIndex((current) => current + 1);
    setContained(false);
    setMessage('New signal loaded. Follow the evidence and isolate the source.');
  };

  return (
    <section className="signal-game" aria-labelledby="signal-title">
      <header className="signal-heading">
        <div>
          <p className="signal-eyebrow">Interactive incident response</p>
          <h2 id="signal-title">Trace the breach. Contain the signal.</h2>
          <p>Read the telemetry, find the compromised layer, and make the call. Three incidents, no countdown.</p>
        </div>
        <div className="signal-score" aria-label={`${score} of ${incidents.length} incidents contained`}>
          <span>{String(score).padStart(2, '0')}</span>
          <small>contained</small>
        </div>
      </header>

      <div className="signal-layout">
        <div className="signal-network">
          <div className="signal-network-topline">
            <span><i /> LIVE TELEMETRY</span>
            <span>INCIDENT {String(incidentIndex + 1).padStart(2, '0')} / {String(incidents.length).padStart(2, '0')}</span>
          </div>
          <div className={`network-map${contained ? ' is-contained' : ''}`} aria-label="Interactive network map">
            <svg className="network-routes" viewBox="0 0 760 310" preserveAspectRatio="none" aria-hidden="true">
              <path d="M92 158H255H438H668" />
              <path d="M255 158V65M438 158V247" />
              <path className="network-flow" d="M92 158H255H438H668" />
            </svg>
            <span className="network-packet" aria-hidden="true" />
            {nodes.map((node, index) => (
              <button
                key={node.id}
                type="button"
                className={`network-node node-${node.id}${contained && node.id === incident.target ? ' is-isolated' : ''}`}
                style={{ '--node-index': index } as React.CSSProperties}
                onClick={() => isolate(node.id)}
                aria-label={`Investigate ${node.label}: ${node.detail}`}
                aria-pressed={contained && node.id === incident.target}
                disabled={complete}
              >
                <span className="network-node-icon" aria-hidden="true">{['◎', '▣', '⌁', '◇'][index]}</span>
                <span className="network-node-label">{node.label}</span>
                <small>{node.detail}</small>
                <kbd>{index + 1}</kbd>
              </button>
            ))}
            <span className="network-pulse pulse-one" aria-hidden="true" />
            <span className="network-pulse pulse-two" aria-hidden="true" />
          </div>
          <div className="signal-legend">
            <span><i className={`severity-dot severity-${incident.severity}`} /> {incident.severity} signal</span>
            <span>{contained ? 'CONTAINMENT ACTIVE' : 'SELECT A LAYER TO INVESTIGATE'}</span>
          </div>
        </div>

        <aside className="signal-brief">
          <div className="signal-brief-topline"><span>INCIDENT BRIEF</span><span>#{incident.id.slice(0, 3).toUpperCase()}-{incidentIndex + 1}7</span></div>
          <p className="signal-alert"><span className={`severity-dot severity-${incident.severity}`} /> {incident.severity} alert</p>
          <h3>{complete ? 'Incident contained.' : incident.signal}</h3>
          <p className="signal-clue">{complete ? 'All three signals are contained. Reset the exercise to test your response again.' : incident.clue}</p>
          <p className={`signal-feedback${contained ? ' is-success' : ''}`} aria-live="polite">{complete ? 'Good call. The environment is secure.' : message}</p>
          <div className="signal-brief-actions">
            <span>Choose a node · keys 1–4</span>
            {(contained || complete) && (
              <button type="button" onClick={nextIncident}>{complete ? 'Run exercise again' : 'Next signal →'}</button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
