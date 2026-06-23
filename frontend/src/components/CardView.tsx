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
}

export default function CardView({ card, faceDown, small }: CardViewProps) {
  if (faceDown || !card) {
    return (
      <div
        className={`flex items-center justify-center rounded-md bg-blue-800 border-2 border-blue-600 ${
          small ? "h-14 w-10 text-xs" : "h-20 w-14 sm:h-24 sm:w-16"
        }`}
      >
        <span className="text-white text-lg sm:text-xl font-bold">?</span>
      </div>
    );
  }

  const color = isRed(card.suit) ? "text-red-600" : "text-gray-900";
  const symbol = SUIT_SYMBOLS[card.suit];
  const label = RANK_LABELS[card.rank];

  if (small) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-md bg-white border border-gray-300 ${color} h-14 w-10 text-xs font-bold shadow`}
      >
        <span>{label}</span>
        <span>{symbol}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg bg-white border-2 border-gray-200 shadow-md ${color} h-20 w-14 sm:h-24 sm:w-16 font-bold`}
    >
      <span className="text-sm sm:text-base leading-none">{symbol}</span>
      <span className="text-base sm:text-lg leading-tight">{label}</span>
    </div>
  );
}
