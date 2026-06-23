import { useState, useEffect } from "react";

interface ChipFlyProps {
    id: number;
    fromTop: string;
    fromLeft: string;
    amount: number;
    onComplete: (id: number) => void;
}

export default function ChipFly({ id, fromTop, fromLeft, amount, onComplete }: ChipFlyProps) {
    const [flying, setFlying] = useState(false);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setFlying(true));
        const timer = setTimeout(() => onComplete(id), 700);
        return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
    }, [id, onComplete]);

    return (
        <div
            className="absolute z-50 pointer-events-none transition-all duration-700 ease-out"
            style={{
                top: flying ? "50%" : fromTop,
                left: flying ? "50%" : fromLeft,
                transform: "translate(-50%, -50%)",
                opacity: flying ? 0 : 1,
            }}
        >
            <div className="h-3 w-3 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border border-yellow-200/50 shadow-lg shadow-yellow-500/40" />
        </div>
    );
}
