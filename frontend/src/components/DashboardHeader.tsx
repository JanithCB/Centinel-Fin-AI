'use client';
import { useState } from 'react';
import styles from './DashboardHeader.module.css';

export default function DashboardHeader() {
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  async function checkHealth() {
    try {
      const res = await fetch('/actuator/health');
      setBackendStatus(res.ok ? 'online' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  }

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.sub}>Welcome back — here's your financial overview.</p>
      </div>
      <div className={styles.actions}>
        <button
          id="btn-check-health"
          className="btn-ghost"
          onClick={checkHealth}
          title="Check backend health"
        >
          {backendStatus === 'unknown' && '◎ Status'}
          {backendStatus === 'online'  && <span style={{ color: 'var(--teal-500)' }}>● Online</span>}
          {backendStatus === 'offline' && <span style={{ color: '#f87171' }}>● Offline</span>}
        </button>
        <button id="btn-notifications" className="btn-ghost" aria-label="Notifications">🔔</button>
        <div className={styles.avatar} aria-label="User profile">JC</div>
      </div>
    </header>
  );
}
