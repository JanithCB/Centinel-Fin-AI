'use client';
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import styles from './SpendingTrendChart.module.css';
import { getSummary } from '@/lib/api';

const FALLBACK_DATA = [
  { month: 'Jun', amount: 28000 },
  { month: 'Feb', amount: 32000 },
  { month: 'Mar', amount: 25000 },
  { month: 'Apr', amount: 41000 },
  { month: 'May', amount: 38000 },
  { month: 'Jun', amount: 44000 },
  { month: 'Jul', amount: 42000 },
  { month: 'Aug', amount: 48000 },
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Recharts passes these props to custom tooltip components
interface TooltipPayloadItem { value: number; name: string; payload: { fill: string } }
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>LKR {payload[0].value.toLocaleString('en-LK')}</p>
    </div>
  );
}

export default function SpendingTrendChart() {
  const [data, setData] = useState(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSummary('demo-user-001', 'monthly')
      .then((res) => {
        const periods = res.totalsPerPeriod;
        if (periods && Object.keys(periods).length > 0) {
          const mapped = Object.entries(periods).map(([key, value], i) => ({
            month: MONTH_LABELS[i % 12] ?? key,
            amount: Number(value),
          }));
          setData(mapped);
        }
      })
      .catch(() => { /* use fallback */ })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`${styles.wrapper} glass-card`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Spending Overview</h2>
        <span className={styles.subtitle}>Monthly Spending Trend</span>
        <span className="badge-teal">↗ Trend</span>
      </div>
      {loading ? (
        <div className={`skeleton ${styles.chartSkeleton}`} />
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4aa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#8faac3', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8faac3', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#00d4aa"
              strokeWidth={2.5}
              fill="url(#tealGrad)"
              dot={{ fill: '#00d4aa', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#00d4aa', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
