import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';
type MissionStatus = 'running' | 'paused' | 'secured' | 'lost';

type MissionSnapshot = {
  status: MissionStatus;
  policies: number;
  shields: number;
  message: string;
};

type Actor = {
  x: number;
  y: number;
  radius: number;
};

type Pickup = Actor & {
  color: string;
  found: boolean;
  label: string;
};

const WORLD = { width: 960, height: 600 };
const START = { x: 76, y: 300 };
const EXIT = { x: 884, y: 300 };
const STARTING_SHIELDS = 3;
const SPEED = 205;
const WALLS = [
  { x: 208, y: 88, width: 34, height: 144 },
  { x: 208, y: 368, width: 34, height: 144 },
  { x: 369, y: 145, width: 38, height: 112 },
  { x: 369, y: 343, width: 38, height: 112 },
  { x: 535, y: 78, width: 36, height: 136 },
  { x: 535, y: 386, width: 36, height: 136 },
  { x: 690, y: 220, width: 38, height: 160 }
];
const PICKUP_STARTS: Omit<Pickup, 'found'>[] = [
  { x: 300, y: 112, radius: 13, color: '#b6a1eb', label: 'IDENTITY' },
  { x: 446, y: 492, radius: 13, color: '#e9b574', label: 'POLICY' },
  { x: 637, y: 126, radius: 13, color: '#85c9b0', label: 'TOOL GATE' }
];

function makePickups(): Pickup[] {
  return PICKUP_STARTS.map((pickup) => ({ ...pickup, found: false }));
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawMission(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  player: Actor,
  pickups: Pickup[],
  shields: number,
  elapsed: number,
  immunity: number,
  status: MissionStatus
) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const scale = Math.min(rect.width / WORLD.width, rect.height / WORLD.height);
  const offsetX = (rect.width - WORLD.width * scale) / 2;
  const offsetY = (rect.height - WORLD.height * scale) / 2;
  context.setTransform(scale * (canvas.width / rect.width), 0, 0, scale * (canvas.height / rect.height), offsetX * (canvas.width / rect.width), offsetY * (canvas.height / rect.height));
  context.clearRect(0, 0, WORLD.width, WORLD.height);

  const background = context.createLinearGradient(0, 0, WORLD.width, WORLD.height);
  background.addColorStop(0, '#1a2234');
  background.addColorStop(0.5, '#121b2b');
  background.addColorStop(1, '#172334');
  context.fillStyle = background;
  context.fillRect(0, 0, WORLD.width, WORLD.height);

  context.save();
  context.beginPath();
  context.rect(28, 28, WORLD.width - 56, WORLD.height - 56);
  context.clip();

  context.strokeStyle = 'rgba(154, 180, 211, .075)';
  context.lineWidth = 1;
  for (let x = 48; x < WORLD.width; x += 40) {
    context.beginPath();
    context.moveTo(x, 32);
    context.lineTo(x, WORLD.height - 32);
    context.stroke();
  }
  for (let y = 48; y < WORLD.height; y += 40) {
    context.beginPath();
    context.moveTo(32, y);
    context.lineTo(WORLD.width - 32, y);
    context.stroke();
  }

  for (let index = 0; index < 7; index += 1) {
    const x = 54 + index * 130;
    context.beginPath();
    context.moveTo(x, 300);
    context.lineTo(x + 70, 300);
    context.strokeStyle = 'rgba(116, 193, 209, .19)';
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(x + 36, 300, 2 + Math.sin(elapsed * 2 + index) * 1.2, 0, Math.PI * 2);
    context.fillStyle = '#7ec8d3';
    context.fill();
  }

  const drawStation = (x: number, y: number, label: string, accent: string) => {
    roundedRect(context, x, y, 106, 48, 12);
    context.fillStyle = 'rgba(34, 43, 59, .88)';
    context.fill();
    context.strokeStyle = `${accent}70`;
    context.lineWidth = 1;
    context.stroke();
    context.beginPath();
    context.arc(x + 16, y + 24, 4, 0, Math.PI * 2);
    context.fillStyle = accent;
    context.fill();
    context.fillStyle = 'rgba(222, 228, 238, .72)';
    context.font = '700 9px "Segoe UI", sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(label, x + 27, y + 24);
  };

  drawStation(73, 62, 'IDENTITY', '#a8bfe9');
  drawStation(770, 62, 'MODEL CORE', '#b7a2eb');
  drawStation(74, 490, 'TELEMETRY', '#e5b475');
  drawStation(778, 490, 'TOOL GATE', '#82c8ab');

  WALLS.forEach((wall, index) => {
    roundedRect(context, wall.x, wall.y, wall.width, wall.height, 9);
    context.fillStyle = 'rgba(38, 53, 70, .93)';
    context.fill();
    context.strokeStyle = 'rgba(157, 185, 207, .26)';
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = 'rgba(169, 196, 213, .25)';
    context.fillRect(wall.x + 8, wall.y + 11, wall.width - 16, 2);
    context.fillStyle = 'rgba(123, 143, 165, .58)';
    for (let light = 0; light < 3; light += 1) {
      context.beginPath();
      context.arc(wall.x + wall.width / 2, wall.y + 24 + light * 11 + (index % 2) * 4, 1.5, 0, Math.PI * 2);
      context.fill();
    }
  });

  roundedRect(context, EXIT.x - 30, EXIT.y - 44, 60, 88, 16);
  context.fillStyle = pickups.every((pickup) => pickup.found) ? 'rgba(114, 187, 152, .25)' : 'rgba(120, 133, 151, .13)';
  context.fill();
  context.strokeStyle = pickups.every((pickup) => pickup.found) ? 'rgba(135, 217, 176, .76)' : 'rgba(158, 173, 193, .29)';
  context.lineWidth = 2;
  context.stroke();
  context.beginPath();
  context.arc(EXIT.x + 12, EXIT.y, 2.5, 0, Math.PI * 2);
  context.fillStyle = pickups.every((pickup) => pickup.found) ? '#9ae1bc' : '#aab6c5';
  context.fill();
  context.fillStyle = 'rgba(218, 226, 235, .65)';
  context.font = '700 9px "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.fillText('SECURE', EXIT.x, EXIT.y + 58);

  pickups.forEach((pickup, index) => {
    if (pickup.found) return;
    const bob = Math.sin(elapsed * 2 + index * 1.8) * 4;
    context.save();
    context.translate(pickup.x, pickup.y + bob);
    context.rotate(Math.PI / 4);
    roundedRect(context, -pickup.radius, -pickup.radius, pickup.radius * 2, pickup.radius * 2, 4);
    context.fillStyle = `${pickup.color}38`;
    context.fill();
    context.strokeStyle = pickup.color;
    context.lineWidth = 2;
    context.shadowColor = pickup.color;
    context.shadowBlur = 13;
    context.stroke();
    context.restore();
    context.shadowBlur = 0;
    context.fillStyle = `${pickup.color}cf`;
    context.font = '700 8px "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.fillText(pickup.label, pickup.x, pickup.y + 30);
  });

  const threatX = 458 + Math.sin(elapsed * 0.8) * 155;
  const threatY = 295 + Math.cos(elapsed * 1.1) * 88;
  const threatPulse = 1 + Math.sin(elapsed * 5) * 0.1;
  context.beginPath();
  context.arc(threatX, threatY, 20 * threatPulse, 0, Math.PI * 2);
  context.fillStyle = 'rgba(226, 125, 119, .13)';
  context.fill();
  context.strokeStyle = 'rgba(235, 141, 126, .85)';
  context.lineWidth = 1.6;
  context.stroke();
  context.beginPath();
  context.arc(threatX, threatY, 8, 0, Math.PI * 2);
  context.fillStyle = '#ef9b81';
  context.shadowColor = '#ef9b81';
  context.shadowBlur = 12;
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = '#35232c';
  context.font = '700 9px "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('!', threatX, threatY + 0.5);
  context.fillStyle = 'rgba(237, 157, 142, .63)';
  context.font = '700 8px "Segoe UI", sans-serif';
  context.fillText('INJECTION', threatX, threatY + 31);

  if (status !== 'paused' && (Math.floor(elapsed * 12) % 4 === 0 || elapsed * 12 % 4 > 2)) {
    context.beginPath();
    context.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(133, 210, 207, .19)';
    context.lineWidth = 1;
    context.stroke();
  }

  const flicker = elapsed < immunity && Math.floor(elapsed * 17) % 2 === 0;
  if (!flicker) {
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    const playerFill = context.createRadialGradient(player.x - 5, player.y - 7, 2, player.x, player.y, player.radius);
    playerFill.addColorStop(0, '#f4e6c9');
    playerFill.addColorStop(0.65, '#b4c6d9');
    playerFill.addColorStop(1, '#748ba7');
    context.fillStyle = playerFill;
    context.fill();
    context.strokeStyle = 'rgba(242, 239, 228, .85)';
    context.lineWidth = 1.4;
    context.stroke();
    context.beginPath();
    context.moveTo(player.x, player.y - player.radius + 2);
    context.lineTo(player.x, player.y - player.radius - 9);
    context.strokeStyle = '#aeb6e6';
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(player.x, player.y - player.radius - 10, 3, 0, Math.PI * 2);
    context.fillStyle = '#d5a8ed';
    context.fill();
    context.beginPath();
    context.arc(player.x - 5, player.y - 2, 1.7, 0, Math.PI * 2);
    context.arc(player.x + 5, player.y - 2, 1.7, 0, Math.PI * 2);
    context.fillStyle = '#3a4658';
    context.fill();
  }

  for (let index = 0; index < shields; index += 1) {
    context.beginPath();
    context.arc(player.x - 9 + index * 9, player.y + 28, 2.4, 0, Math.PI * 2);
    context.fillStyle = '#8dd4b3';
    context.fill();
  }
  context.restore();

  context.strokeStyle = 'rgba(158, 184, 209, .4)';
  context.lineWidth = 1.5;
  roundedRect(context, 28, 28, WORLD.width - 56, WORLD.height - 56, 20);
  context.stroke();
}

export default function AgentMission() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heldDirections = useRef(new Set<Direction>());
  const snapshotRef = useRef<MissionSnapshot>({
    status: 'running',
    policies: 0,
    shields: STARTING_SHIELDS,
    message: 'Collect all 3 trust policies, avoid the injected payload, and guide Milo to SECURE.'
  });
  const playerRef = useRef<Actor>({ x: START.x, y: START.y, radius: 15 });
  const pickupsRef = useRef(makePickups());
  const elapsedRef = useRef(0);
  const immunityRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [snapshot, setSnapshot] = useState(snapshotRef.current);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context) return;

    let animationFrame = 0;
    let previousDraw = 0;
    let pixelRatio = 1;
    const mission = snapshotRef.current;

    const updateSnapshot = (message?: string) => {
      if (message) mission.message = message;
      setSnapshot({ ...mission });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(rect.width * pixelRatio);
      canvas.height = Math.round(rect.height * pixelRatio);
      drawMission(context, canvas, playerRef.current, pickupsRef.current, mission.shields, elapsedRef.current, immunityRef.current, mission.status);
    };

    const move = (direction: Direction) => {
      const directions = heldDirections.current;
      if (directions.has(direction)) return;
      directions.add(direction);
      canvas.focus({ preventScroll: true });
    };
    const release = (direction: Direction) => heldDirections.current.delete(direction);

    const keyDirections: Record<string, Direction> = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right'
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = keyDirections[event.code];
      if (!direction || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName))) return;
      event.preventDefault();
      move(direction);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const direction = keyDirections[event.code];
      if (direction) release(direction);
    };
    const onBlur = () => heldDirections.current.clear();
    const onVisibilityChange = () => {
      if (document.hidden) heldDirections.current.clear();
    };

    const collidesWithWall = (x: number, y: number) => WALLS.some((wall) => {
      const nearestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const nearestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const dx = x - nearestX;
      const dy = y - nearestY;
      return dx * dx + dy * dy < playerRef.current.radius ** 2;
    });

    const tick = (time: number) => {
      animationFrame = 0;
      if (document.hidden) return;

      const delta = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.04) : 0;
      lastTimeRef.current = time;
      if (mission.status === 'running') {
        elapsedRef.current += delta;
        const directions = heldDirections.current;
        let dx = Number(directions.has('right')) - Number(directions.has('left'));
        let dy = Number(directions.has('down')) - Number(directions.has('up'));
        const magnitude = Math.hypot(dx, dy) || 1;
        dx /= magnitude;
        dy /= magnitude;
        const player = playerRef.current;
        const nextX = Math.max(48, Math.min(WORLD.width - 48, player.x + dx * SPEED * delta));
        const nextY = Math.max(48, Math.min(WORLD.height - 48, player.y + dy * SPEED * delta));
        if (!collidesWithWall(nextX, player.y)) player.x = nextX;
        if (!collidesWithWall(player.x, nextY)) player.y = nextY;

        let changed = false;
        pickupsRef.current.forEach((pickup) => {
          if (!pickup.found && Math.hypot(player.x - pickup.x, player.y - pickup.y) < player.radius + pickup.radius + 5) {
            pickup.found = true;
            mission.policies += 1;
            changed = true;
            mission.message = `${pickup.label} trust policy verified. ${3 - mission.policies} remaining.`;
          }
        });

        const threatX = 458 + Math.sin(elapsedRef.current * 0.8) * 155;
        const threatY = 295 + Math.cos(elapsedRef.current * 1.1) * 88;
        if (elapsedRef.current >= immunityRef.current && Math.hypot(player.x - threatX, player.y - threatY) < player.radius + 15) {
          mission.shields -= 1;
          immunityRef.current = elapsedRef.current + 1.5;
          player.x = START.x;
          player.y = START.y;
          changed = true;
          mission.message = mission.shields > 0
            ? `Injected payload blocked by your shield. ${mission.shields} ${mission.shields === 1 ? 'shield' : 'shields'} left.`
            : 'Milo is safely back at base. Restart whenever you’re ready.';
          if (mission.shields <= 0) {
            mission.shields = 0;
            mission.status = 'lost';
            directions.clear();
          }
        }

        if (mission.policies === 3 && Math.hypot(player.x - EXIT.x, player.y - EXIT.y) < 40) {
          mission.status = 'secured';
          mission.message = 'Runtime secured. Milo verified the policies and closed the untrusted tool path.';
          directions.clear();
          changed = true;
        }

        if (changed) updateSnapshot();
      }

      if (time - previousDraw >= 1000 / 30) {
        drawMission(context, canvas, playerRef.current, pickupsRef.current, mission.shields, elapsedRef.current, immunityRef.current, mission.status);
        previousDraw = time;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const onDirectionPointerDown = (direction: Direction) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const directions = heldDirections.current;
    if (!directions.has(direction)) directions.add(direction);
  };
  const onDirectionPointerUp = (direction: Direction) => () => heldDirections.current.delete(direction);

  const togglePause = () => {
    const mission = snapshotRef.current;
    if (mission.status === 'secured' || mission.status === 'lost') return;
    mission.status = mission.status === 'paused' ? 'running' : 'paused';
    mission.message = mission.status === 'paused' ? 'Mission paused. Take a breather; Milo will wait.' : 'Back online. Guide Milo to the secure gateway.';
    setSnapshot({ ...mission });
  };

  const restartMission = () => {
    const mission = snapshotRef.current;
    mission.status = 'running';
    mission.policies = 0;
    mission.shields = STARTING_SHIELDS;
    mission.message = 'Mission live. Collect all 3 trust policies, avoid the injected payload, and secure the runtime.';
    playerRef.current = { x: START.x, y: START.y, radius: 15 };
    pickupsRef.current = makePickups();
    elapsedRef.current = 0;
    immunityRef.current = 0;
    lastTimeRef.current = 0;
    heldDirections.current.clear();
    setSnapshot({ ...mission });
    canvasRef.current?.focus({ preventScroll: true });
  };

  const terminalState = snapshot.status === 'secured' || snapshot.status === 'lost';

  return (
    <section className="agent-mission" aria-label="Milo's AI security mission">
      <div className="mission-topline">
        <div>
          <h2>Milo: Trust Protocol</h2>
          <p>Collect three policy keys, isolate the instruction hidden in external content, and reach the secure gateway without letting the roaming payload catch Milo.</p>
        </div>
      </div>

      <div className="mission-hud" aria-label="Mission status">
        <div className="mission-hud-card"><span>TRUST POLICIES</span><strong>{snapshot.policies}<small> / 3</small></strong></div>
        <div className="mission-hud-card mission-shields"><span>MILO’S SHIELDS</span><strong aria-label={`${snapshot.shields} shields`}>{'◆'.repeat(snapshot.shields)}<small>{'◇'.repeat(STARTING_SHIELDS - snapshot.shields)}</small></strong></div>
        <button className="mission-pause" type="button" disabled={terminalState} onClick={togglePause}>
          {snapshot.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className={`mission-canvas-wrap${terminalState ? ' is-terminal' : ''}`}>
        <canvas
          aria-label="AI security simulation environment. Control Milo with WASD or arrow keys, collect three glowing trust policies, avoid the moving injected-payload threat, then reach the secure gateway on the right."
          className="mission-canvas"
          height={600}
          ref={canvasRef}
          role="img"
          tabIndex={0}
          width={960}
        />
        {snapshot.status === 'paused' && <div className="mission-overlay"><strong>Mission paused</strong><span>Milo’s standing by.</span><button type="button" onClick={togglePause}>Resume mission</button></div>}
        {terminalState && (
          <div className="mission-overlay">
            <strong>{snapshot.status === 'secured' ? 'Runtime secured' : 'Mission interrupted'}</strong>
            <span>{snapshot.message}</span>
            <button type="button" onClick={restartMission}>{snapshot.status === 'secured' ? 'Play again' : 'Try again'}</button>
          </div>
        )}
      </div>

      <div className="mission-controls-row">
        <p className="mission-feedback" aria-live="polite">{snapshot.message}</p>
        <div className="mission-key-hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>or</span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd><span>move Milo</span></div>
      </div>

      <div className="mission-touch-controls" aria-label="Touch controls">
        <button aria-label="Move Milo up" className="touch-up" onPointerCancel={onDirectionPointerUp('up')} onPointerDown={onDirectionPointerDown('up')} onPointerUp={onDirectionPointerUp('up')} type="button">↑</button>
        <button aria-label="Move Milo left" className="touch-left" onPointerCancel={onDirectionPointerUp('left')} onPointerDown={onDirectionPointerDown('left')} onPointerUp={onDirectionPointerUp('left')} type="button">←</button>
        <button aria-label="Move Milo down" className="touch-down" onPointerCancel={onDirectionPointerUp('down')} onPointerDown={onDirectionPointerDown('down')} onPointerUp={onDirectionPointerUp('down')} type="button">↓</button>
        <button aria-label="Move Milo right" className="touch-right" onPointerCancel={onDirectionPointerUp('right')} onPointerDown={onDirectionPointerDown('right')} onPointerUp={onDirectionPointerUp('right')} type="button">→</button>
        <span>HOLD TO MOVE</span>
      </div>
      <p className="mission-footnote">A small interactive AI-security simulation. Nothing is downloaded, collected, or connected to a real system.</p>
    </section>
  );
}
