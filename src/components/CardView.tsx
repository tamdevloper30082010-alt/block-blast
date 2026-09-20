import { motion } from 'framer-motion';
import type { Card } from '../lib/tienlen/cards';
import { suitColor } from '../lib/tienlen/cards';

type Props = {
  card?: Card;
  faceDown?: boolean;
  selected?: boolean;
  small?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  index?: number;
  highlight?: boolean;
};

export default function CardView({
  card,
  faceDown = false,
  selected = false,
  small = false,
  disabled = false,
  onClick,
  highlight = false,
}: Props) {
  const size = small
    ? { w: 32, h: 44, fontSize: 11, suitSize: 16 }
    : { w: 52, h: 74, fontSize: 18, suitSize: 28 };

  const color = card ? suitColor(card.suit) : 'black';

  if (faceDown || !card) {
    return (
      <div
        className="rounded-lg border-2 flex items-center justify-center"
        style={{
          width: size.w,
          height: size.h,
          background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
          borderColor: 'rgba(168, 85, 247, 0.5)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="text-center"
          style={{
            fontSize: size.suitSize * 0.6,
            color: '#a855f7',
            fontWeight: 'bold',
          }}
        >
          🂠
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileTap={disabled ? {} : { scale: 0.95 }}
      onClick={disabled ? undefined : onClick}
      animate={{
        y: selected ? -12 : 0,
        boxShadow: selected
          ? `0 8px 20px rgba(168, 85, 247, 0.6)`
          : highlight
            ? `0 0 20px rgba(34, 211, 238, 0.6)`
            : `0 2px 4px rgba(0,0,0,0.3)`,
      }}
      className={`relative rounded-lg border-2 select-none ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
      style={{
        width: size.w,
        height: size.h,
        background: 'linear-gradient(to bottom, #ffffff 0%, #f5f3ff 100%)',
        borderColor: selected ? '#a855f7' : highlight ? '#22d3ee' : 'rgba(255,255,255,0.4)',
        touchAction: 'none',
      }}
    >
      <div
        className="absolute top-1 left-1 leading-none font-display font-bold"
        style={{ color: color === 'red' ? '#dc2626' : '#0f172a', fontSize: size.fontSize }}
      >
        {card.rank}
      </div>
      <div
        className="absolute leading-none"
        style={{
          color: color === 'red' ? '#dc2626' : '#0f172a',
          fontSize: size.suitSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {card.suit}
      </div>
      <div
        className="absolute bottom-1 right-1 leading-none font-display font-bold"
        style={{
          color: color === 'red' ? '#dc2626' : '#0f172a',
          fontSize: size.fontSize,
          transform: 'rotate(180deg)',
        }}
      >
        {card.rank}
      </div>
    </motion.div>
  );
}
