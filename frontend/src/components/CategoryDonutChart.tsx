'use client';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import styles from './CategoryDonutChart.module.css';
import { getSummary } from '@/lib/api';

const COLORS = ['#00d4aa', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];

const FALLBACK = [
  { name: 'Groceries',      value: 18500 },
  { name: 'Food & Dining',  value: 12900 },
  { name: 'Transport',      value: 7200  },
  { name: 'Subscriptions',  value: 3500  },
];

interface DonutTooltipPayload { value: number; name: string; payload: { fill: string } }
interface DonutTooltipProps { active?: boolean; payload?: DonutTooltipPayload[] }

function CustomTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p style={{ color: payload[0].payload.fill, fontWeight: 600, fontSize: '0.82rem' }}>
        {payload[0].name}
      </p>
      <p style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
        LKR {payload[0].value.toLocaleString('en-LK')}
      </p>
    </div>
  );
}

export default function CategoryDonutChart() {
  const [data, setData] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSummary('demo-user-001', 'monthly')
      .then((res) => {
        const cats = res.totalsByCategory;
        if (cats && Object.keys(cats).length > 0) {
          setData(Object.entries(cats).map(([name, value]) => ({ name, value: Number(value) })));
        }
      })
      .catch(() => { /* use fallback */ })
      .finally(() => setLoading(false));
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className={`${styles.wrapper} glass-card`}>
      <h2 className={styles.title}>Spending by Category</h2>
      {loading ? (
        <div className={`skeleton ${styles.chartSkeleton}`} />
      ) : (
        <div className={styles.body}>
          <div className={styles.chartArea}>
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total label */}
            <div className={styles.centerLabel}>
              <span className={styles.centerValue}>
                {Math.round(total / 1000)}k
              </span>
              <span className={styles.centerSub}>Total</span>
            </div>
          </div>

          {/* Legend */}
          <ul className={styles.legend}>
            {data.map((item, i) => {
              const pct = Math.round((item.value / total) * 100);
              return (
                <li key={item.name} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: COLORS[i % COLORS.length] }} />
                  <span className={styles.legendName}>{item.name}</span>
                  <span className={styles.legendAmount}>
                    LKR {item.value.toLocaleString('en-LK')}
                    <span className={styles.legendPct}> {pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
