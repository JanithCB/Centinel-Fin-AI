'use client';
import styles from './AiInsightCard.module.css';

export default function AiInsightCard() {
  return (
    <div className={`${styles.card} glass-card fade-in-up delay-2`}>
      <div className={styles.header}>
        <span className={styles.bulb}>💡</span>
        <span className={styles.title}>AI-generated Insight</span>
      </div>
      <p className={styles.body}>
        Your spending is <strong>12% lower</strong> than last week. Consider saving the difference.
      </p>
      <button className="btn-teal" id="btn-ai-explore" style={{ fontSize: '0.78rem', padding: '7px 14px' }}>
        Explore Insights →
      </button>
    </div>
  );
}
