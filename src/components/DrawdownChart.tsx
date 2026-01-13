import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { EquityCurvePoint } from "@/types/backtest";

interface DrawdownChartProps {
  data: EquityCurvePoint[];
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(0, 62%, 50%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(0, 62%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fill: 'hsl(215, 14%, 50%)', fontSize: 10 }}
            axisLine={{ stroke: 'hsl(220, 14%, 16%)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={formatPercent}
            tick={{ fill: 'hsl(215, 14%, 50%)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={45}
            domain={['dataMin', 0]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(220, 14%, 9%)',
              border: '1px solid hsl(220, 14%, 16%)',
              borderRadius: '6px',
              fontSize: '12px'
            }}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            formatter={(value: number) => [formatPercent(value), 'Drawdown']}
          />
          <Area 
            type="monotone" 
            dataKey="drawdown" 
            stroke="hsl(0, 62%, 50%)" 
            strokeWidth={1.5}
            fill="url(#drawdownGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
