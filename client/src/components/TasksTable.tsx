import { useState } from 'react';
import { Play, FastForward, CheckCircle2, Clock, Package, AlertCircle } from 'lucide-react';
import { RoverTask, TaskStatus } from '../types.js';

interface TasksTableProps {
  tasks: RoverTask[];
  onRefresh: () => void;
  currentRole: string;
}

export function TasksTable({ tasks, onRefresh, currentRole }: TasksTableProps) {
  const [filter, setFilter] = useState<'ALL' | 'READY' | 'ACTIVE' | 'SNOOZED' | 'COMPLETED'>('ALL');
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'READY') return task.status === 'READY' || task.status === 'SCHEDULED';
    if (filter === 'ACTIVE') return task.status === 'DISPATCHED' || task.status === 'EN_ROUTE' || task.status === 'ARRIVED' || task.status === 'AWAITING_CONFIRMATION';
    if (filter === 'SNOOZED') return task.status === 'SNOOZED';
    if (filter === 'COMPLETED') return task.status === 'COMPLETED';
    return true;
  });

  const handleDispatch = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      await fetch(`/api/rover/tasks/${taskId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: currentRole })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleFastForwardRetry = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      await fetch(`/api/rover/tasks/${taskId}/retry`, { method: 'POST' });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleConfirm = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      await fetch(`/api/rover/tasks/${taskId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentRole,
          confidence: 98,
          notes: 'Biometric face match verified at bedside.'
        })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const handleManualResolve = async (taskId: string) => {
    setLoadingTaskId(taskId);
    try {
      await fetch(`/api/rover/tasks/${taskId}/manual-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: currentRole,
          notes: 'Caregiver personally delivered medicine and completed task.'
        })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'READY':
        return <span className="badge badge-ready">Ready to Dispatch</span>;
      case 'DISPATCHED':
      case 'EN_ROUTE':
        return (
          <span className="badge badge-moving">
            <span className="ping-indicator" style={{ marginRight: '4px' }}>
              <span className="ping" style={{ backgroundColor: '#f59e0b' }} />
              <span className="dot" style={{ backgroundColor: '#f59e0b' }} />
            </span>
            En Route
          </span>
        );
      case 'ARRIVED':
      case 'AWAITING_CONFIRMATION':
        return (
          <span className="badge badge-arrived">
            <span className="ping-indicator" style={{ marginRight: '4px' }}>
              <span className="ping" style={{ backgroundColor: '#10b981' }} />
              <span className="dot" style={{ backgroundColor: '#10b981' }} />
            </span>
            At Resident Room
          </span>
        );
      case 'SNOOZED':
        return <span className="badge badge-snoozed">Snoozed</span>;
      case 'STAFF_ATTENTION_REQUIRED':
        return <span className="badge badge-escalated">Staff Attention Required</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed"><CheckCircle2 size={12} /> Delivered</span>;
      default:
        return <span className="badge badge-docked">{status}</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {/* Table Header & Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Scheduled Care Deliveries
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Autonomous package and comfort item mission lifecycle
          </p>
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          {(['ALL', 'READY', 'ACTIVE', 'SNOOZED', 'COMPLETED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                background: filter === tab ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: filter === tab ? '#38bdf8' : 'var(--text-secondary)',
                border: filter === tab ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <th style={{ padding: '12px 16px' }}>Resident & Room</th>
              <th style={{ padding: '12px 16px' }}>Item / Package</th>
              <th style={{ padding: '12px 16px' }}>Schedule Time</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Attempts</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No care delivery tasks found in this view.
                </td>
              </tr>
            ) : (
              filteredTasks.map(task => {
                const isHero = task.resident.roomNumber === '102';
                const isLoading = loadingTaskId === task.id;

                return (
                  <tr
                    key={task.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.2s ease',
                      background: isHero ? 'rgba(56, 189, 248, 0.03)' : 'transparent'
                    }}
                  >
                    {/* Resident & Room */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: isHero ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#ffffff'
                        }}>
                          {task.resident.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{task.resident.name}</span>
                            {isHero && (
                              <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: '#38bdf8', color: '#0f172a', fontWeight: 800 }}>
                                HERO
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Room {task.resident.roomNumber}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Item */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Package size={16} color="#38bdf8" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                          {task.schedule?.itemName || 'Daily Care Delivery'}
                        </span>
                      </div>
                    </td>

                    {/* Scheduled Time */}
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <Clock size={14} />
                        <span>{task.schedule?.scheduledTime || '10:00 AM'}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '16px' }}>
                      {getStatusBadge(task.status)}
                    </td>

                    {/* Attempts */}
                    <td style={{ padding: '16px', fontSize: '0.85rem' }}>
                      <span style={{
                        color: task.attemptCount > 1 ? '#f59e0b' : 'var(--text-secondary)',
                        fontWeight: task.attemptCount > 1 ? 700 : 500
                      }}>
                        {task.attemptCount} / {task.schedule?.maxAttempts ?? 3}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {task.status === 'READY' && (
                        <button
                          onClick={() => handleDispatch(task.id)}
                          disabled={isLoading}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        >
                          <Play size={14} />
                          <span>Dispatch Rover</span>
                        </button>
                      )}

                      {task.status === 'SNOOZED' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleFastForwardRetry(task.id)}
                            disabled={isLoading}
                            className="btn btn-warning"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            title="Hackathon Demo Accelerator: Skip 10m snooze timer"
                          >
                            <FastForward size={14} />
                            <span>⚡ Retry Now</span>
                          </button>
                        </div>
                      )}

                      {task.status === 'STAFF_ATTENTION_REQUIRED' && (
                        <button
                          onClick={() => handleManualResolve(task.id)}
                          disabled={isLoading}
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <AlertCircle size={14} />
                          <span>Resolve Manually</span>
                        </button>
                      )}

                      {(task.status === 'DISPATCHED' || task.status === 'EN_ROUTE') && (
                        <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                          🚀 Driving to {task.resident?.roomNumber ? `Room ${task.resident.roomNumber}` : 'Room'}...
                        </span>
                      )}

                      {(task.status === 'ARRIVED' || task.status === 'AWAITING_CONFIRMATION') && (
                        <button
                          onClick={() => handleConfirm(task.id)}
                          disabled={isLoading}
                          className="btn btn-primary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.75rem',
                            background: '#10b981',
                            borderColor: '#10b981',
                            color: '#ffffff',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)'
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>Dispense & Confirm</span>
                        </button>
                      )}

                      {task.status === 'COMPLETED' && (
                        <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>
                          Completed ✓
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
