import Sidebar             from '@/components/Sidebar';
import DashboardHeader     from '@/components/DashboardHeader';
import StatsCards          from '@/components/StatsCards';
import SpendingTrendChart  from '@/components/SpendingTrendChart';
import CategoryDonutChart  from '@/components/CategoryDonutChart';
import RecentTransactions  from '@/components/RecentTransactions';
import AiInsightCard       from '@/components/AiInsightCard';
import AiAssistantPanel    from '@/components/AiAssistantPanel';
import IngestionTrigger    from '@/components/IngestionTrigger';
import styles              from './page.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.shell}>
      <Sidebar />

      <div className={styles.main}>
        <DashboardHeader />

        <div className={styles.content}>

          {/* ── Row 1: Stat cards ──────────────────────────── */}
          <section className={`${styles.section} fade-in-up`}>
            <StatsCards />
          </section>

          {/* ── Row 2: Trend chart + AI Insight card ────────── */}
          <section className={`${styles.row} fade-in-up delay-1`}>
            <SpendingTrendChart />
            <AiInsightCard />
          </section>

          {/* ── Row 3: Donut chart + Recent transactions ────── */}
          <section className={`${styles.row} fade-in-up delay-2`}>
            <CategoryDonutChart />
            <RecentTransactions />
          </section>

          {/* ── Row 4: Developer – Mock Ingestion Trigger ────── */}
          <section className={`${styles.section} fade-in-up delay-3`}>
            <IngestionTrigger />
          </section>

        </div>
      </div>

      {/* Floating AI chat panel */}
      <AiAssistantPanel />
    </div>
  );
}
