// Five bars, alternating profit/loss color, each bouncing on a
// staggered delay — reads like a tiny live price feed rather than a
// generic spinner. Deliberately the same on every page: a spinner's
// whole point is that it doesn't need to match the content behind
// it, unlike the skeleton approach this replaced.
const BAR_COLORS = ["profit", "loss", "profit", "loss", "profit"] as const;

export default function CandleLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-end gap-1.5" role="status" aria-label="Loading">
        {BAR_COLORS.map((color, i) => (
          <div
            key={i}
            className={`w-2 rounded-full ${color === "profit" ? "bg-profit" : "bg-loss"}`}
            style={{
              height: "28px",
              animation: "candle-bounce 0.9s ease-in-out infinite",
              animationDelay: `${i * 0.12}s`,
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>
    </div>
  );
}