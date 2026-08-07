import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';

interface SpendingChartProps {
  data: { category: string; total: number; emoji: string }[];
  currency: string;
}

const COLORS = ['#B47AEA', '#FF71CE', '#39FF14', '#FF5757', '#FACC15', '#22D3EE', '#F472B6', '#A78BFA', '#FB923C'];

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="glass bg-surface-card border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono mb-1">{data.name}</p>
        <p className="text-xs font-semibold text-white">
          spent: <span className="text-lavender font-numeric font-extrabold">{currency}{data.value.toLocaleString('en-IN')}</span>
        </p>
      </div>
    );
  }
  return null;
};

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={6}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 9}
        outerRadius={outerRadius + 11}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
        cornerRadius={2}
      />
    </g>
  );
};

export function SpendingChart({ data, currency }: SpendingChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = data.map((item) => ({
    name: `${item.emoji} ${item.category}`,
    value: item.total,
  }));

  const totalSpent = data.reduce((acc, item) => acc + item.total, 0);

  if (chartData.length === 0) {
    return <div className="h-64 flex items-center justify-center text-white/40 text-xs select-none">No spending data yet.</div>;
  }

  const hoveredCategory = activeIndex !== null ? data[activeIndex] : null;
  const displayLabel = hoveredCategory ? hoveredCategory.category : 'Total Spent';
  const displayAmount = hoveredCategory ? hoveredCategory.total : totalSpent;
  const displayPercentage = hoveredCategory 
    ? `${((hoveredCategory.total / totalSpent) * 100).toFixed(0)}%` 
    : 'all expenses';
  const displayEmoji = hoveredCategory ? hoveredCategory.emoji : '';

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      {/* Chart Canvas */}
      <div className="relative h-48 w-full select-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex !== null ? activeIndex : undefined}
              activeShape={renderActiveShape}
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={68}
              cornerRadius={6}
              paddingAngle={4}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Spent Overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
          <p className="text-[9px] text-white/40 dark:text-white/40 light:text-gray-500 uppercase tracking-widest font-mono font-extrabold transition-all flex items-center justify-center gap-1">
            {displayEmoji && <span>{displayEmoji}</span>}
            <span className="capitalize">{displayLabel}</span>
          </p>
          <p className="text-lg font-black text-white dark:text-white light:text-obsidian glow-text-lavender my-0.5 font-numeric">
            {currency}{displayAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[9px] text-white/45 dark:text-white/45 light:text-gray-400 font-mono tracking-wide">
            {displayPercentage}
          </p>
        </div>
      </div>

      {/* Custom Aesthetic HTML Legend */}
      <div className="flex flex-wrap gap-2 justify-center max-h-24 overflow-y-auto px-2 pb-2">
        {data.map((item, index) => {
          const isHovered = activeIndex === index;
          const percentage = ((item.total / totalSpent) * 100).toFixed(0);
          return (
            <div
              key={index}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isHovered 
                  ? 'bg-white/10 border-white/20 scale-[1.02] shadow shadow-black/20' 
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
              }`}
              style={{
                borderColor: isHovered ? COLORS[index % COLORS.length] : undefined,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs font-bold text-white/90 capitalize select-none">
                {item.emoji} {item.category}
              </span>
              <span className="text-[10px] text-white/40 font-mono font-numeric select-none">
                {percentage}% ({currency}{item.total.toLocaleString('en-IN')})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
