import { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'kiosk' | 'audit'>('dashboard');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            🤖
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>HSL CARE</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              Smart Rover Autonomous Delivery & Assistance
            </p>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: '8px' }}>
          {(['dashboard', 'monitor', 'kiosk', 'audit'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ textTransform: 'capitalize', padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {tab === 'kiosk' ? '📱 Rover Kiosk' : tab}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>
            Phase 0 & 1 Initialized Successfully
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 24px auto' }}>
            HSL Care Smart Rover core architecture, PostgreSQL Prisma models, deterministic seed data, and monorepo structure are ready.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <span className="badge badge-ready">Database: PostgreSQL</span>
            <span className="badge badge-arrived">ORM: Prisma 6.4</span>
            <span className="badge badge-completed">Hardware: UGV-Beast / Pi</span>
          </div>
        </div>
      </main>
    </div>
  );
}
