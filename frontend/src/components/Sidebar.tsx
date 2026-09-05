'use client';
import styles from './Sidebar.module.css';

const navItems = [
  { label: 'Dashboard', icon: '⊞', href: '#', active: true },
  { label: 'Transactions', icon: '⇄', href: '#', active: false },
  { label: 'Analytics', icon: '⊡', href: '#', active: false },
  { label: 'AI Assistant', icon: '✦', href: '#', active: false },
  { label: 'Insights', icon: '◎', href: '#', active: false },
  { label: 'Settings', icon: '⚙', href: '#', active: false },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15 2L4 7.5V14.5C4 20.5 8.8 26.1 15 28C21.2 26.1 26 20.5 26 14.5V7.5L15 2Z"
              stroke="#00d4aa"
              strokeWidth="1.8"
              fill="none"
            />
            <rect x="10" y="17" width="2.5" height="5" rx="1" fill="#00d4aa" />
            <rect x="13.75" y="13" width="2.5" height="9" rx="1" fill="#00d4aa" />
            <rect x="17.5" y="10" width="2.5" height="12" rx="1" fill="#00d4aa" />
          </svg>
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>Centinel</span>
          <span className={styles.logoSubtitle}>Fin AI</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`${styles.navItem} ${item.active ? styles.navActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {item.active && <span className={styles.activeIndicator} />}
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <div className={styles.userAvatar}>JC</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Demo User</span>
          <span className={styles.userSub}>demo-user-001</span>
        </div>
      </div>
    </aside>
  );
}
