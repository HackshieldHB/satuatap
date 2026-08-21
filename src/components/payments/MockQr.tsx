import { useMemo } from "react";

const QR_SIZE = 25;

/** Deterministic pseudo-QR so the same seed always renders the same pattern. */
export function MockQr({
  seed,
  className = "h-52 w-52",
}: {
  seed: string;
  className?: string;
}) {
  const cells = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rnd = () => {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      return h / 0x7fffffff;
    };
    return Array.from({ length: QR_SIZE * QR_SIZE }, () => rnd() > 0.5);
  }, [seed]);

  const finders: [number, number][] = [
    [0, 0],
    [0, QR_SIZE - 7],
    [QR_SIZE - 7, 0],
  ];
  const inFinder = (r: number, c: number) =>
    finders.some(([br, bc]) => r >= br && r < br + 7 && c >= bc && c < bc + 7);

  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Kode QRIS (simulasi)"
    >
      <rect width={QR_SIZE} height={QR_SIZE} fill="#FFFFFF" />
      {cells.map((on, i) => {
        const r = Math.floor(i / QR_SIZE);
        const c = i % QR_SIZE;
        if (!on || inFinder(r, c)) return null;
        return <rect key={i} x={c} y={r} width={1} height={1} fill="#1F2937" />;
      })}
      {finders.map(([r, c], i) => (
        <g key={i}>
          <rect x={c} y={r} width={7} height={7} fill="#1F2937" />
          <rect x={c + 1} y={r + 1} width={5} height={5} fill="#FFFFFF" />
          <rect x={c + 2} y={r + 2} width={3} height={3} fill="#1F2937" />
        </g>
      ))}
    </svg>
  );
}
