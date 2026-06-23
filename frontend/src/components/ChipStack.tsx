interface ChipStackProps {
  amount: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const CHIP_DENOMS = [
  { threshold: 10000, color: "bg-amber-400/80 border-amber-500", label: "金" },
  { threshold: 5000, color: "bg-purple-500/70 border-purple-400", label: "紫" },
  { threshold: 1000, color: "bg-emerald-500/70 border-emerald-400", label: "绿" },
  { threshold: 500, color: "bg-blue-500/70 border-blue-400", label: "蓝" },
  { threshold: 100, color: "bg-white/30 border-white/60", label: "白" },
];

const SIZE_MAP = {
  sm: { chip: "h-7 w-7", stack: "h-8 w-8", text: "text-xs", translate: "-translate-y-1", offset: "-ml-1 mt-0.5" },
  md: { chip: "h-9 w-9", stack: "h-10 w-10", text: "text-sm", translate: "-translate-y-1.5", offset: "-ml-1.5 mt-1" },
  lg: { chip: "h-10 w-10", stack: "h-11 w-11", text: "text-sm", translate: "-translate-y-2", offset: "-ml-2 mt-1" },
};

export default function ChipStack({ amount, size = "md", showLabel = true }: ChipStackProps) {
  const dims = SIZE_MAP[size];

  if (amount < 100) {
    return (
      <div className={`inline-flex items-center gap-1`}>
        <div className={`relative ${dims.stack}`}>
          <div className={`absolute inset-0 rounded-full border-2 border-dashed border-white/20 bg-white/5 ${dims.translate}`} />
        </div>
        {showLabel && <span className={`${dims.text} text-white/40 font-mono`}>0</span>}
      </div>
    );
  }

  // Build up to 3 layers — highest denoms first
  const layers: { color: string; label: string }[] = [];
  let remaining = amount;
  for (const denom of CHIP_DENOMS) {
    if (remaining >= denom.threshold && layers.length < 3) {
      layers.push({ color: denom.color, label: denom.label });
      remaining -= denom.threshold;
    }
  }
  if (layers.length === 0) {
    layers.push({ color: CHIP_DENOMS[CHIP_DENOMS.length - 1].color, label: CHIP_DENOMS[CHIP_DENOMS.length - 1].label });
  }

  return (
    <div className={`inline-flex items-center gap-1`}>
      <div className={`relative ${dims.stack}`}>
        {layers.map((layer, i) => (
          <div
            key={i}
            className={`absolute rounded-full border-2 ${layer.color} ${dims.chip} ${i > 0 ? dims.offset : ""}`}
            style={{ zIndex: layers.length - i }}
          />
        ))}
      </div>
      {showLabel && (
        <span className={`${dims.text} text-yellow-300 font-bold font-mono`}>
          {amount.toLocaleString()}
        </span>
      )}
    </div>
  );
}
