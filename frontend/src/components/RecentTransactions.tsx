'use client';
import styles from './RecentTransactions.module.css';

const MOCK_TRANSACTIONS = [
  { id: 1, merchant: 'Keells Super',  category: 'Groceries',    amount: 2500,  time: 'Today',     icon: '🛒', color: '#00d4aa' },
  { id: 2, merchant: 'Uber',          category: 'Transport',     amount: 850,   time: 'Today',     icon: '🚗', color: '#3b82f6' },
  { id: 3, merchant: 'PickMe Food',   category: 'Food & Dining', amount: 1450,  time: 'Today',     icon: '🍔', color: '#f59e0b' },
  { id: 4, merchant: 'Netflix',       category: 'Subscriptions', amount: 1200,  time: 'Yesterday', icon: '📺', color: '#f43f5e' },
  { id: 5, merchant: 'Dialog',        category: 'Utilities',     amount: 2000,  time: 'Yesterday', icon: '📡', color: '#8b5cf6' },
];

export default function RecentTransactions() {
  return (
    <div className={`${styles.wrapper} glass-card`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Recent Transactions</h2>
        <button className="btn-ghost" id="btn-view-all-txn">View all</button>
      </div>
      <ul className={styles.list}>
        {MOCK_TRANSACTIONS.map((txn, i) => (
          <li
            key={txn.id}
            className={`${styles.item} fade-in-up delay-${Math.min(i + 1, 4)}`}
          >
            <div className={styles.iconWrap} style={{ '--accent': txn.color } as React.CSSProperties}>
              <span className={styles.icon}>{txn.icon}</span>
            </div>
            <div className={styles.info}>
              <span className={styles.merchant}>{txn.merchant}</span>
              <span className={styles.category}>{txn.category}</span>
            </div>
            <div className={styles.right}>
              <span className={styles.amount}>- LKR {txn.amount.toLocaleString('en-LK')}</span>
              <span className={styles.time}>{txn.time}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
