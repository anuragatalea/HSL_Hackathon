import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LoginPage } from './components/LoginPage.js';
import { ResidentPortal } from './components/ResidentPortal.js';
import { Header } from './components/Header.js';
import { Dashboard } from './components/Dashboard.js';
import { SchedulesManagement } from './components/SchedulesManagement.js';
import { ResidentsManagement } from './components/ResidentsManagement.js';
import { AuditLogViewer } from './components/AuditLogViewer.js';
import { ScheduleModal } from './components/ScheduleModal.js';
import { AuthModal } from './components/AuthModal.js';
import { AssistanceAlertBanner } from './components/AssistanceAlertBanner.js';
import { MedicationCatalog } from './components/MedicationCatalog.js';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'residents' | 'audit' | 'formulary'>('dashboard');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState('Nurse Sarah Jenkins (RN-402)');

  const { sessionType, currentResident, logout, isAuthModalOpen, setIsAuthModalOpen, isLoading } = useAuth();

  // Show subtle loading state while checking session
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(222, 47%, 9%)',
        color: '#38bdf8',
        fontWeight: 700
      }}>
        Initializing ALEA Care Smart Rover OS...
      </div>
    );
  }

  // 1. Strict Gate: If not authenticated, show full-screen LoginPage (no dashboard without login)
  if (!sessionType) {
    return <LoginPage />;
  }

  // 2. Resident Portal: If logged in as resident, show dedicated simple resident page
  if (sessionType === 'RESIDENT' && currentResident) {
    return (
      <ResidentPortal
        resident={currentResident}
        onLogout={logout}
      />
    );
  }

  // 3. Staff Portal: Full caregiver and administrative command center
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
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
        <AssistanceAlertBanner />

        {activeTab === 'dashboard' && (
          <Dashboard
            currentRole={currentRole}
            isScheduleModalOpen={isScheduleModalOpen}
            onCloseScheduleModal={() => setIsScheduleModalOpen(false)}
            onNavigateToSchedules={() => setActiveTab('schedules')}
          />
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

        {activeTab === 'formulary' && (
          <MedicationCatalog currentRole={currentRole} />
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
