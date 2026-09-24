import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pill, Clock, Edit2, Play, Trash2, User, PauseCircle, PlayCircle, CheckCircle2 } from 'lucide-react';
import { RoverSchedule } from '../types.js';
import { socket } from '../socket.js';
import { EditScheduleModal } from './EditScheduleModal.js';

interface SchedulesManagementProps {
  currentRole: string;
  onOpenCreate: () => void;
}

export const SchedulesManagement: React.FC<SchedulesManagementProps> = ({
  currentRole,
  onOpenCreate
}) => {
  const [schedules, setSchedules] = useState<RoverSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const [editingSchedule, setEditingSchedule] = useState<RoverSchedule | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rover/schedules');
      const json = await res.json();
      if (json.success) {
        setSchedules(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch schedules:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();

    function onScheduleCreated() {
      fetchSchedules();
    }
    function onScheduleUpdated() {
      fetchSchedules();
    }
    function onScheduleDeleted() {
      fetchSchedules();
    }

    socket.on('schedule:created', onScheduleCreated);
    socket.on('schedule:updated', onScheduleUpdated);
    socket.on('schedule:deleted', onScheduleDeleted);

    return () => {
      socket.off('schedule:created', onScheduleCreated);
      socket.off('schedule:updated', onScheduleUpdated);
      socket.off('schedule:deleted', onScheduleDeleted);
    };
  }, [fetchSchedules]);

  // Handle Trigger Now (Generates immediate task)
  const handleTriggerNow = async (schedule: RoverSchedule) => {
    try {
      setActionLoadingId(schedule.id);
      const res = await fetch(`/api/rover/schedules/${schedule.id}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: currentRole })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`⚡ Delivery triggered for ${schedule.resident.name} (${schedule.itemName})! Task is READY.`);
      } else {
        showToast(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Toggle Active/Pause
  const handleToggleActive = async (schedule: RoverSchedule) => {
    try {
      setActionLoadingId(schedule.id);
      const newStatus = !schedule.isActive;
      const res = await fetch(`/api/rover/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus, assignedStaffId: currentRole })
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, isActive: newStatus } : s));
        showToast(`Schedule for ${schedule.resident.name} ${newStatus ? 'Resumed' : 'Paused'}.`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete
  const handleDelete = async (schedule: RoverSchedule) => {
    if (!window.confirm(`Are you sure you want to delete the schedule for "${schedule.itemName}" (${schedule.resident.name})?`)) {
      return;
    }

    try {
      setActionLoadingId(schedule.id);
      const res = await fetch(`/api/rover/schedules/${schedule.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSchedules(prev => prev.filter(s => s.id !== schedule.id));
        showToast(`Deleted schedule for ${schedule.resident.name}.`);
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered schedules
  const filtered = schedules.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.resident?.name.toLowerCase().includes(q) ||
      s.resident?.roomNumber.toLowerCase().includes(q) ||
      s.itemName.toLowerCase().includes(q) ||
      s.scheduledTime.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (statusFilter === 'ACTIVE') return s.isActive;
    if (statusFilter === 'PAUSED') return !s.isActive;
    return true;
  });

  const activeCount = schedules.filter(s => s.isActive).length;
  const pausedCount = schedules.filter(s => !s.isActive).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Banner */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          background: 'hsl(222, 47%, 12%)',
          color: 'hsl(210, 40%, 98%)',
          border: '1px solid hsl(217, 91%, 60%)',
          borderRadius: '8px',
          padding: '10px 18px',
          fontSize: '13px',
          fontWeight: 600,
          zIndex: 1000,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px hsla(217, 91%, 60%, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <CheckCircle2 size={16} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'hsl(210, 40%, 98%)' }}>
              📅 Resident Medication & Delivery Schedules
            </h2>
            <span style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {schedules.length} Active Protocols
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Configure recurring pill passes, adjust medicine names/dosages, change delivery times, and edit retry rules.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          <span>+ New Delivery Schedule</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Status Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '3px',
          gap: '4px'
        }}>
          <button
            onClick={() => setStatusFilter('ALL')}
            style={{
              background: statusFilter === 'ALL' ? 'hsl(217, 91%, 60%)' : 'transparent',
              color: statusFilter === 'ALL' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Schedules ({schedules.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            style={{
              background: statusFilter === 'ACTIVE' ? 'hsl(142, 70%, 45%)' : 'transparent',
              color: statusFilter === 'ACTIVE' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('PAUSED')}
            style={{
              background: statusFilter === 'PAUSED' ? 'hsl(215, 25%, 32%)' : 'transparent',
              color: statusFilter === 'PAUSED' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Paused ({pausedCount})
          </button>
        </div>

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '6px 12px',
          gap: '8px',
          width: '320px'
        }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resident, room, medication..."
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Schedules Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading delivery schedules...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No delivery schedules found matching your filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <th style={{ padding: '14px 20px' }}>Resident & Room</th>
                  <th style={{ padding: '14px 20px' }}>Medication / Care Item</th>
                  <th style={{ padding: '14px 20px' }}>Scheduled Time</th>
                  <th style={{ padding: '14px 20px' }}>Snooze / Retry Rules</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sched) => (
                  <tr
                    key={sched.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Resident & Room */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(56, 189, 248, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#38bdf8'
                        }}>
                          <User size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'hsl(210, 40%, 98%)' }}>
                            {sched.resident?.name}
                          </div>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: '#38bdf8',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            marginTop: '2px'
                          }}>
                            Room {sched.resident?.roomNumber || sched.roomId}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Medication / Item */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Pill size={16} color="#38bdf8" />
                          <span style={{ fontWeight: 600, color: 'hsl(210, 40%, 98%)' }}>
                            {sched.itemName}
                          </span>
                        </div>
                        {sched.medications && Array.isArray(sched.medications) && sched.medications.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '3px' }}>
                            {sched.medications.map((m, mIdx) => (
                              <span
                                key={mIdx}
                                style={{
                                  fontSize: '11px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  color: '#38bdf8'
                                }}
                              >
                                💊 {m.name} ({m.dose}) • Box #{m.compartment || 1}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Scheduled Time & Frequency */}
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={15} color="#10b981" />
                        <span style={{ fontWeight: 700, color: 'hsl(210, 40%, 98%)' }}>
                          {sched.scheduledTime}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          {sched.frequency}
                        </span>
                      </div>
                    </td>

                    {/* Snooze and Max Attempts */}
                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      <div>
                        {sched.snoozeDurationMin}m snooze • Max {sched.maxAttempts} tries
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: sched.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                        border: `1px solid ${sched.isActive ? '#10b981' : '#64748b'}`,
                        color: sched.isActive ? '#34d399' : '#94a3b8',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: sched.isActive ? '#10b981' : '#94a3b8',
                          boxShadow: sched.isActive ? '0 0 6px #10b981' : 'none'
                        }} />
                        <span>{sched.isActive ? 'Active' : 'Paused'}</span>
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        {/* Trigger Now Button */}
                        <button
                          onClick={() => handleTriggerNow(sched)}
                          disabled={actionLoadingId === sched.id}
                          title="Generate immediate delivery task for this resident"
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Play size={12} />
                          <span>Trigger Now</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingSchedule(sched)}
                          title="Edit medication, dosage, time, or retry rules"
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#e2e8f0',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        {/* Pause / Resume Button */}
                        <button
                          onClick={() => handleToggleActive(sched)}
                          disabled={actionLoadingId === sched.id}
                          title={sched.isActive ? 'Pause Schedule' : 'Resume Schedule'}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: sched.isActive ? '#f59e0b' : '#10b981',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {sched.isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(sched)}
                          disabled={actionLoadingId === sched.id}
                          title="Delete this schedule permanently"
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Schedule Modal */}
      {editingSchedule && (
        <EditScheduleModal
          schedule={editingSchedule}
          isOpen={true}
          onClose={() => setEditingSchedule(null)}
          onSaveSuccess={(updated) => {
            setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
            showToast(`Schedule for ${updated.resident?.name || 'Resident'} updated successfully!`);
          }}
          currentRole={currentRole}
        />
      )}
    </div>
  );
};
