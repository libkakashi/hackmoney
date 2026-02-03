'use client';

export const PriceChart = () => {
  // Mock data points for the placeholder line
  const points = [
    20, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 50, 48, 55, 52, 60, 58, 52, 55,
    62, 68, 65, 72, 70, 75,
  ];

  const width = 400;
  const height = 120;
  const padding = 8;

  const maxVal = Math.max(...points);
  const minVal = Math.min(...points);

  const getX = (i: number) =>
    padding + (i / (points.length - 1)) * (width - padding * 2);
  const getY = (val: number) =>
    height -
    padding -
    ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p)}`)
    .join(' ');

  const areaPath = `${linePath} L ${getX(points.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="min-h-50 flex flex-col">
      {/* Chart */}
      <div className="flex-1 relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-40 opacity-40"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="rgb(34 197 94)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Coming soon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-dim">coming soon</p>
          </div>
        </div>
      </div>
      <div className="text-xs text-terminal-dim">
        [ Having a price chart is easy on mainnet with geckoterminal, we dont
        want to do the effort of making a whole custom indexer just for the
        testing env. ]
      </div>
    </div>
  );
};
