import type { Card } from "../types";

const SUIT_SYMBOLS = {
  spades: "♠",
  hearts: "♥",
  clubs: "♣",
  diamonds: "♦",
};

const RANK_LABELS: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8",
  9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

function isRed(suit: string): boolean {
  return suit === "hearts" || suit === "diamonds";
}

interface CardViewProps {
  card?: Card;
  faceDown?: boolean;
  small?: boolean;
  micro?: boolean;
}

const SIZE_CLASSES = {
  micro: "h-9 w-6",
  small: "h-14 w-10",
  normal: "h-20 w-14 sm:h-24 sm:w-16",
};

export default function CardView({ card, faceDown, small, micro }: CardViewProps) {
  // small is now an alias for normal size — no separate small size
  const variant = micro ? "micro" : "normal";
  const sizeClass = SIZE_CLASSES[variant];

  // Face-down
  if (faceDown || !card) {
    if (micro) {
      return (
        <div className={`flex items-center justify-center rounded bg-blue-800 border border-blue-600 ${SIZE_CLASSES.micro}`}>
          <span className="text-white font-bold text-[10px]">?</span>
        </div>
      );
    }
    return (
      <div
        className={`relative flex items-center justify-center rounded-md ${sizeClass} overflow-hidden`}
        style={{
          background: "linear-gradient(135deg, #1e3a5f, #1e3a8a 40%, #312e81)",
          backgroundImage: `
            linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.05) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.05) 75%)
          `,
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        }}
      >
        {/* Inner border frame */}
        <div className="absolute inset-[3px] rounded border border-blue-400/30" />
        {/* Center 🀄 icon */}
        <span className="relative z-10 text-lg select-none opacity-80">🀄</span>
      </div>
    );
  }

  // Face-up
  const color = isRed(card.suit) ? "text-red-500" : "text-gray-900";
  const symbol = SUIT_SYMBOLS[card.suit];
  const label = RANK_LABELS[card.rank];

  if (micro) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded bg-gradient-to-br from-white to-gray-50/80 border border-gray-300/80 ${SIZE_CLASSES.micro} shadow-md ${color}`}
      >
        <span className="text-[10px] font-bold leading-none">{symbol}</span>
      </div>
    );
  }

  // Normal size — professional card layout
  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-white to-gray-50/80 border border-gray-300/80 ${sizeClass} shadow-md ${color}`}
    >
      {/* Top-left rank */}
      <span className="absolute top-0.5 left-1 text-xs font-bold leading-none">{label}</span>
      {/* Bottom-right rank (flipped) */}
      <span className="absolute bottom-0.5 right-1 text-xs font-bold leading-none scale-y-[-1]">{label}</span>
      {/* Center suit */}
      <span className={`font-bold ${variant === "micro" ? "text-sm" : "text-xl"}`}>{symbol}</span>
    </div>
  );
}
