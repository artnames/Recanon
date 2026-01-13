import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { EquityCurvePoint } from "@/types/backtest";

interface EquityChartProps {
  data: EquityCurvePoint[];
}

export function EquityChart({ data }: EquityChartProps) {
  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(173, 58%, 45%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(173, 58%, 45%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fill: 'hsl(215, 14%, 50%)', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(220, 14%, 16%)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            tickFormatter={formatValue}
            tick={{ fill: 'hsl(215, 14%, 50%)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(220, 14%, 9%)',
              border: '1px solid hsl(220, 14%, 16%)',
              borderRadius: '6px',
              fontSize: '12px'
            }}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            formatter={(value: number) => [formatValue(value), 'Equity']}
          />
          <ReferenceLine y={data[0]?.equity || 100000} stroke="hsl(215, 14%, 30%)" strokeDasharray="4 4" />
          <Area 
            type="monotone" 
            dataKey="equity" 
            stroke="hsl(173, 58%, 45%)" 
            strokeWidth={2}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
