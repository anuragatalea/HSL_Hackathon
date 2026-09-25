import { Battery, BatteryCharging, CalendarCheck, Navigation, AlertTriangle } from 'lucide-react';
import { RoverDevice, RoverTask } from '../types.js';

interface MetricsRowProps {
  rover: RoverDevice | null;
  tasks: RoverTask[];
}

export function MetricsRow({ rover, tasks }: MetricsRowProps) {
  const scheduledCount = tasks.filter(t => t.status === 'SCHEDULED' || t.status === 'READY').length;
  const inFlightCount = tasks.filter(
    t => t.status === 'DISPATCHED' || t.status === 'EN_ROUTE' || t.status === 'ARRIVED' || t.status === 'AWAITING_CONFIRMATION'
  ).length;
  const snoozedCount = tasks.filter(t => t.status === 'SNOOZED').length;
  const attentionCount = tasks.filter(t => t.status === 'STAFF_ATTENTION_REQUIRED').length;

  const battery = rover?.batteryLevel ?? 100;
  const batteryColor = battery > 50 ? '#10b981' : battery > 20 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {/* 1. Rover Fleet Status */}
      <div className="glass-panel" style={{
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '3px solid #38bdf8'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fleet Status
            </p>
            <h3 style={{ fontSize: '1.25rem', marginTop: '4px' }}>
              {rover?.name || 'Rover-01'}
            </h3>
          </div>
          <div style={{
            padding: '8px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.1)',
            color: '#38bdf8'
          }}>
            {rover?.status === 'IDLE' ? <BatteryCharging size={22} /> : <Battery size={22} />}
          </div>
        </div>

        {/* Battery Progress Bar */}
        <div style={{ marginTop: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Battery Level</span>
            <span style={{ fontWeight: 700, color: batteryColor }}>{battery}%</span>
          </div>
          <div style={{
            height: '6px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '999px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${battery}%`,
              background: batteryColor,
              borderRadius: '999px',
              transition: 'width 0.5s ease-in-out'
            }} />
          </div>
        </div>

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`badge ${
            rover?.status === 'MOVING' ? 'badge-moving' :
            rover?.status === 'ARRIVED' ? 'badge-arrived' :
            rover?.status === 'RETURNING' ? 'badge-moving' :
            rover?.status === 'ESTOP' ? 'badge-escalated' : 'badge-docked'
          }`}>
            {rover?.status || 'IDLE'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Location: {rover?.currentRoom || 'DOCK'}
          </span>
        </div>
      </div>

      {/* 2. Today's Scheduled Deliveries */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderTop: '3px solid #6366f1'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Scheduled Today
            </p>
            <h3 style={{ fontSize: '2rem', marginTop: '4px', fontWeight: 800 }}>
              {tasks.length}
            </h3>
          </div>
          <div style={{
            padding: '8px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#818cf8'
          }}>
            <CalendarCheck size={22} />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>{scheduledCount}</span> ready for dispatch
        </p>
      </div>

      {/* 3. In-Flight Missions */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderTop: '3px solid #10b981'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              In Transit / Active
            </p>
            <h3 style={{ fontSize: '2rem', marginTop: '4px', fontWeight: 800 }}>
              {inFlightCount}
            </h3>
          </div>
          <div style={{
            padding: '8px',
            borderRadius: '10px',
            background: inFlightCount > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            boxShadow: inFlightCount > 0 ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
          }}>
            <Navigation size={22} className={inFlightCount > 0 ? 'animate-bounce' : ''} />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          {inFlightCount > 0 ? (
            <span style={{ color: '#10b981', fontWeight: 600 }}>● Rover executing care mission</span>
          ) : (
            'All active deliveries complete'
          )}
        </p>
      </div>

      {/* 4. Attention & Snooze Alerts */}
      <div className="glass-panel" style={{
        padding: '20px',
        borderTop: attentionCount > 0 ? '3px solid #ef4444' : snoozedCount > 0 ? '3px solid #ec4899' : '3px solid #f59e0b'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Snoozed / Attention
            </p>
            <h3 style={{ fontSize: '2rem', marginTop: '4px', fontWeight: 800, color: attentionCount > 0 ? '#f87171' : snoozedCount > 0 ? '#f472b6' : 'var(--text-primary)' }}>
              {snoozedCount + attentionCount}
            </h3>
          </div>
          <div style={{
            padding: '8px',
            borderRadius: '10px',
            background: attentionCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.1)',
            color: attentionCount > 0 ? '#ef4444' : '#f59e0b'
          }}>
            <AlertTriangle size={22} />
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
          {attentionCount > 0 ? (
            <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ {attentionCount} requires staff attention</span>
          ) : snoozedCount > 0 ? (
            <span style={{ color: '#ec4899', fontWeight: 600 }}>🕒 {snoozedCount} delivery snoozed</span>
          ) : (
            'Zero pending exceptions'
          )}
        </p>
      </div>
    </div>
  );
}
