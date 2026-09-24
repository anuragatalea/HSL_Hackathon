import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { Dashboard } from './components/Dashboard.js';
import { MissionMonitor } from './components/MissionMonitor.js';
import { SchedulesManagement } from './components/SchedulesManagement.js';
import { ResidentsManagement } from './components/ResidentsManagement.js';
import { RoverKiosk } from './components/RoverKiosk.js';
import { AuditLogViewer } from './components/AuditLogViewer.js';
import { DemoToolbar } from './components/DemoToolbar.js';
import { JudgeDemoModal } from './components/JudgeDemoModal.js';
import { ScheduleModal } from './components/ScheduleModal.js';
import { AuthModal } from './components/AuthModal.js';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monitor' | 'schedules' | 'residents' | 'kiosk' | 'audit'>('dashboard');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState('Nurse Sarah Jenkins (RN-402)');

  const { isAuthModalOpen, setIsAuthModalOpen } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '70px' }}>
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSchedule={() => setIsScheduleModalOpen(true)}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            currentRole={currentRole}
            isScheduleModalOpen={isScheduleModalOpen}
            onCloseScheduleModal={() => setIsScheduleModalOpen(false)}
            onNavigateToSchedules={() => setActiveTab('schedules')}
          />
        )}

        {activeTab === 'monitor' && (
          <MissionMonitor currentRole={currentRole} />
        )}

        {activeTab === 'schedules' && (
          <SchedulesManagement
            currentRole={currentRole}
            onOpenCreate={() => setIsScheduleModalOpen(true)}
          />
        )}

        {activeTab === 'residents' && (
          <ResidentsManagement
            currentRole={currentRole}
            onNavigateToSchedules={() => setActiveTab('schedules')}
          />
        )}

        {activeTab === 'kiosk' && (
          <RoverKiosk currentRole={currentRole} />
        )}

        {activeTab === 'audit' && (
          <AuditLogViewer />
        )}
      </main>

      {/* Global Schedule Creation Modal */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSuccess={() => setIsScheduleModalOpen(false)}
        currentRole={currentRole}
      />

      {/* Presenter Floating Toolbar */}
      <DemoToolbar
        onOpenPitchModal={() => setIsJudgeModalOpen(true)}
      />

      {/* Judge Pitch Guide Modal */}
      <JudgeDemoModal
        isOpen={isJudgeModalOpen}
        onClose={() => setIsJudgeModalOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onTriggerHeroReset={() => {
          fetch('/api/rover/demo/reset', { method: 'POST' }).catch(console.error);
        }}
      />

      {/* Multi-role Staff Authentication & Quick Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
