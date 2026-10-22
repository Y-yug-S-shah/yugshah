type NetworkNode = {
  x: number;
  y: number;
  label: string;
  color: string;
};

const COLORS = ['#9bc4dc', '#b4a1d8', '#ddaa76', '#91c9b0'];

export function mountAgentSecurityBackdrop(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const nodes: NetworkNode[] = [
    { x: 0.19, y: 0.24, label: 'IDENTITY', color: COLORS[0] },
    { x: 0.81, y: 0.24, label: 'ENDPOINT', color: COLORS[1] },
    { x: 0.19, y: 0.72, label: 'NETWORK', color: COLORS[2] },
    { x: 0.81, y: 0.72, label: 'CLOUD', color: COLORS[3] }
  ];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let frame = 0;
  let previousFrame = 0;
  let elapsed = 0;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
  };

  const draw = () => {
    if (!context) return;
    context.clearRect(0, 0, width, height);

    const compact = width < 640;
    const centerX = width * 0.5;
    const centerY = height * (compact ? 0.23 : 0.45);
    const radius = compact ? Math.min(width * 0.105, 34) : Math.min(width * 0.057, 48);
    const cardWidth = compact ? Math.min(104, width * 0.28) : Math.min(145, width * 0.14);
    const cardHeight = compact ? 32 : 42;
    const orbitWidth = compact ? Math.min(width * 0.36, 130) : Math.min(width * 0.32, 245);
    const orbitHeight = compact ? 68 : Math.min(height * 0.31, 205);
    const nodePositions = compact
      ? [
          { x: width * 0.18, y: centerY + orbitHeight * 1.2 },
          { x: width * 0.82, y: centerY + orbitHeight * 1.2 },
          { x: width * 0.18, y: centerY + orbitHeight * 2.4 },
          { x: width * 0.82, y: centerY + orbitHeight * 2.4 }
        ]
      : nodes.map((node) => ({ x: node.x * width, y: centerY + (node.y - 0.48) * height * 0.76 }));

    context.save();
    context.globalAlpha = 0.75;
    context.strokeStyle = 'rgba(161, 178, 208, .19)';
    context.lineWidth = 1;
    context.setLineDash([3, 8]);
    context.beginPath();
    context.ellipse(centerX, centerY, orbitWidth, orbitHeight, 0, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    nodePositions.forEach((point, index) => {
      const color = COLORS[index];
      const offsetX = point.x + (centerX - point.x) * 0.4;
      const offsetY = point.y + (centerY - point.y) * 0.4;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(offsetX, offsetY);
      context.lineTo(point.x, point.y);
      context.strokeStyle = `${color}35`;
      context.stroke();

      context.beginPath();
      context.roundRect(point.x - cardWidth / 2, point.y - cardHeight / 2, cardWidth, cardHeight, 12);
      context.fillStyle = 'rgba(30, 32, 42, .62)';
      context.fill();
      context.strokeStyle = `${color}58`;
      context.lineWidth = 1;
      context.font = `600 ${compact ? 8 : 9}px "Segoe UI", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = 'rgba(226, 229, 236, .73)';
      context.fillText(nodes[index].label, point.x, point.y);

      const travel = (elapsed * 0.13 + index * 0.27) % 1;
      const t = travel < 0.5 ? travel * 2 : (1 - travel) * 2;
      const dotX = centerX + (point.x - centerX) * t;
      const dotY = centerY + (point.y - centerY) * t;
      context.beginPath();
      context.arc(dotX, dotY, compact ? 1.8 : 2.4, 0, Math.PI * 2);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = 8;
      context.fill();
      context.shadowBlur = 0;
    });

    const gradient = context.createRadialGradient(centerX - radius * 0.3, centerY - radius * 0.35, 2, centerX, centerY, radius * 1.45);
    gradient.addColorStop(0, 'rgba(224, 220, 245, .94)');
    gradient.addColorStop(0.48, 'rgba(168, 164, 203, .78)');
    gradient.addColorStop(1, 'rgba(117, 129, 160, .3)');
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.shadowColor = '#b8addc';
    context.shadowBlur = compact ? 13 : 23;
    context.fill();
    context.shadowBlur = 0;
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.71, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255, 255, 255, .48)';
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = '#37384b';
    context.font = `700 ${compact ? 9 : 11}px "Segoe UI", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('MILO', centerX, centerY);

    context.font = `600 ${compact ? 8 : 10}px "Segoe UI", sans-serif`;
    context.fillStyle = 'rgba(205, 207, 218, .54)';
    context.fillText('TRUST · TOOLS · TELEMETRY', centerX, centerY + radius + (compact ? 13 : 17));
    context.restore();
  };

  const animate = (timestamp: number) => {
    frame = 0;
    if (document.hidden) return;
    if (timestamp - previousFrame >= 1000 / 24) {
      elapsed += Math.min((timestamp - previousFrame) / 1000, 0.1);
      previousFrame = timestamp;
      draw();
    }
    if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate);
  };

  const start = () => {
    if (frame || document.hidden || reducedMotion.matches) return;
    previousFrame = performance.now();
    frame = window.requestAnimationFrame(animate);
  };

  const stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };

  const syncMotionPreference = () => {
    if (reducedMotion.matches) stop();
    else start();
  };

  const syncVisibility = () => {
    if (document.hidden) stop();
    else syncMotionPreference();
  };

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  document.addEventListener('visibilitychange', syncVisibility);
  reducedMotion.addEventListener('change', syncMotionPreference);
  resize();
  start();
}
