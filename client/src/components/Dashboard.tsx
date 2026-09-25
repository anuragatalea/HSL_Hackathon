import { useState, useEffect, useCallback } from 'react';
import { MetricsRow } from './MetricsRow.js';
import { RoverHeroCard } from './RoverHeroCard.js';
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
    function onRoverTelemetry(updatedRover: RoverDevice) {
      setRover(prev => (prev?.id === updatedRover.id ? { ...prev, ...updatedRover } : updatedRover));
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

  return (
    <div>
      {/* Resident Urgent Alert Banner */}
      <AssistanceAlertBanner />

      {/* Top 4 KPI Glass Cards */}
      <MetricsRow rover={rover} tasks={tasks} />

      {/* Rover-01 Live Telemetry & Control Hero Card */}
      <RoverHeroCard
        rover={rover}
        activeTask={activeTask}
        onRefresh={fetchInitialData}
      />

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
