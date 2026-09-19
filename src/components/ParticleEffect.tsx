import { useEffect, useState } from 'react';

export type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
};

type Props = {
  particles: Particle[];
  onDone?: (id: number) => void;
};

export default function ParticleEffect({ particles, onDone }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {particles.map(p => <ParticleDot key={p.id} p={p} onDone={onDone} />)}
    </div>
  );
}

function ParticleDot({ p, onDone }: { p: Particle; onDone?: (id: number) => void }) {
  const [pos, setPos] = useState({ x: p.x, y: p.y, opacity: 1, scale: 1 });

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000;
      if (elapsed >= p.life) {
        onDone?.(p.id);
        return;
      }
      const t = elapsed / p.life;
      const x = p.x + p.vx * elapsed;
      const y = p.y + p.vy * elapsed + 200 * elapsed * elapsed; // gravity
      setPos({ x, y, opacity: 1 - t, scale: 1 - t * 0.5 });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [p, onDone]);

  return (
    <div
      className="particle"
      style={{
        left: pos.x,
        top: pos.y,
        width: p.size,
        height: p.size,
        backgroundColor: p.color,
        opacity: pos.opacity,
        transform: `translate(-50%, -50%) scale(${pos.scale})`,
        boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
      }}
    />
  );
}
