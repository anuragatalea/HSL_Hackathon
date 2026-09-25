import { useState, useEffect, useCallback } from 'react';
import { MetricsRow } from './MetricsRow.js';
import { RoverHeroCard } from './RoverHeroCard.js';
import { FacilityFloorplanSVG } from './FacilityFloorplanSVG.js';
import { TasksTable } from './TasksTable.js';
import { AssistanceAlertBanner } from './AssistanceAlertBanner.js';
import { ScheduleModal } from './ScheduleModal.js';
import { RoverDevice, RoverTask } from '../types.js';
import { socket } from '../socket.js';

interface DashboardProps {
  currentRole: string;
  isScheduleModalOpen: boolean;
  onCloseScheduleModal: () => void;
  onNavigateToSchedules?: () => void;
}

export function Dashboard({ currentRole, isScheduleModalOpen, onCloseScheduleModal, onNavigateToSchedules }: DashboardProps) {
  const [rover, setRover] = useState<RoverDevice | null>(null);
  const [tasks, setTasks] = useState<RoverTask[]>([]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [devicesRes, tasksRes] = await Promise.all([
        fetch('/api/rover/devices'),
        fetch('/api/rover/tasks')
      ]);

      const devicesJson = await devicesRes.json();
      const tasksJson = await tasksRes.json();

      if (devicesJson.success && devicesJson.data.length > 0) {
        setRover(devicesJson.data[0]);
      }
      if (tasksJson.success) {
        setTasks(tasksJson.data);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    // Real-time Socket.io listeners
    function onRoverTelemetry(updatedRover: any) {
      setRover(prev => {
        const id = updatedRover.id || updatedRover.roverId || prev?.id;
        const normalized = {
          ...(prev || {}),
          ...updatedRover,
          id,
          roverId: id
        };
        return normalized;
      });
    }

    function onTaskUpdated(updatedTask: RoverTask) {
      setTasks(prev => {
        const index = prev.findIndex(t => t.id === updatedTask.id);
        if (index >= 0) {
          const clone = [...prev];
          clone[index] = { ...clone[index], ...updatedTask };
          return clone;
        }
        return [updatedTask, ...prev];
      });
    }

    socket.on('rover:telemetry', onRoverTelemetry);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:created', fetchInitialData);

    return () => {
      socket.off('rover:telemetry', onRoverTelemetry);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:created', fetchInitialData);
    };
  }, [fetchInitialData]);

  // Find active in-flight task (if any)
  const activeTask = tasks.find(
    t => t.status === 'DISPATCHED' || t.status === 'EN_ROUTE' || t.status === 'ARRIVED' || t.status === 'AWAITING_CONFIRMATION'
  ) || null;

  const [mapNotice, setMapNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleSendRoverToRoom = async (roomNumber: string) => {
    const roverId = rover?.id || (rover as any)?.roverId;
    if (!roverId) {
      alert('Rover is currently connecting, please wait a moment.');
      return;
    }
    const label = roomNumber === 'STATION' ? 'Nurse Station' : roomNumber === 'MED_ROOM' ? 'Medical Store' : roomNumber === 'DOCK' ? 'Charging Dock' : `Room ${roomNumber}`;
    setMapNotice({ message: `🚀 Command Received: Dispatching Rover to ${label}...`, type: 'info' });

    try {
      const res = await fetch(`/api/rover/devices/${roverId}/send-to-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNumber })
      });
      const data = await res.json();
      if (data.success) {
        setMapNotice({ message: `✅ ${data.message || `Rover dispatched to ${label}!`}`, type: 'success' });
        fetchInitialData();
        setTimeout(() => setMapNotice(null), 6000);
      } else {
        setMapNotice({ message: `❌ ${data.error || 'Failed to dispatch command'}`, type: 'error' });
        setTimeout(() => setMapNotice(null), 6000);
      }
    } catch (e: any) {
      console.error('Failed to send rover to room:', e);
      setMapNotice({ message: `❌ Network error: ${e.message}`, type: 'error' });
      setTimeout(() => setMapNotice(null), 6000);
    }
  };

  return (
    <div>
      {/* Resident Urgent Alert Banner */}
      <AssistanceAlertBanner />

      {/* Top 4 KPI Glass Cards */}
      <MetricsRow rover={rover} tasks={tasks} />

      {/* 2-Column Operational Command Center: 2D Facility Tracking Map + Mission & Rover Controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(400px, 1.35fr) minmax(350px, 1fr)',
        gap: '20px',
        marginBottom: '24px',
        alignItems: 'stretch'
      }}>
        {/* Left: 2D Interactive Facility Floorplan */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'hsl(210, 40%, 98%)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🗺️ Facility Map & Rover Real-Time Tracking</span>
              <span style={{
                fontSize: '0.72rem',
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 700
              }}>
                👉 Click any room to send rover
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>11.5×18 ft Prototype Layout</span>
          </div>

          {mapNotice && (
            <div style={{
              marginBottom: '10px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: mapNotice.type === 'success' ? 'rgba(16, 185, 129, 0.18)' : mapNotice.type === 'error' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(56, 189, 248, 0.18)',
              border: `1px solid ${mapNotice.type === 'success' ? '#10b981' : mapNotice.type === 'error' ? '#ef4444' : '#38bdf8'}`,
              color: mapNotice.type === 'success' ? '#34d399' : mapNotice.type === 'error' ? '#f87171' : '#38bdf8',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              {mapNotice.message}
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <FacilityFloorplanSVG rover={rover} activeTask={activeTask} onSendToRoom={handleSendRoverToRoom} />
          </div>
        </div>

        {/* Right: Active Mission & Rover Live Telemetry / Dispatch */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <RoverHeroCard
            rover={rover}
            activeTask={activeTask}
            onRefresh={fetchInitialData}
          />
        </div>
      </div>

      {/* Quick Jump Bar between Tasks Queue and Schedules */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(210, 40%, 98%)' }}>
          📋 Live Dispatch Queue & Missions ({tasks.length})
        </div>
        {onNavigateToSchedules && (
          <button
            onClick={onNavigateToSchedules}
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📅 Manage & Edit Recurring Schedules ↗</span>
          </button>
        )}
      </div>

      {/* Tasks Queue & One-Click Dispatch Table */}
      <TasksTable
        tasks={tasks}
        onRefresh={fetchInitialData}
        currentRole={currentRole}
      />

      {/* Schedule Delivery Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={onCloseScheduleModal}
        onSuccess={fetchInitialData}
        currentRole={currentRole}
      />
    </div>
  );
}
