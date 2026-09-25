import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Resident, AuthSessionType } from '../types.js';

interface AuthContextType {
  sessionType: AuthSessionType | null;
  currentUser: User | null;
  currentResident: Resident | null;
  token: string | null;
  staffUsers: User[];
  availableResidents: Resident[];
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  loginStaff: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  quickLoginStaff: (roleOrEmail: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  quickLogin: (roleOrEmail: string) => Promise<boolean>;
  loginResident: (residentIdOrRoom?: string) => Promise<boolean>;
  logout: () => void;
  can: (action: 'override' | 'dispatch' | 'enroll' | 'audit' | 'vitals' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionType, setSessionType] = useState<AuthSessionType | null>(() => {
    return (localStorage.getItem('hsl_auth_session') as AuthSessionType) || null;
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentResident, setCurrentResident] = useState<Resident | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hsl_auth_token'));
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [availableResidents, setAvailableResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch available staff & residents directory for fast demo logins
  const loadDirectory = async () => {
    try {
      const [usersRes, residentsRes] = await Promise.all([
        fetch('/api/rover/auth/users'),
        fetch('/api/rover/residents')
      ]);

      const [usersData, residentsData] = await Promise.all([
        usersRes.json(),
        residentsRes.json()
      ]);

      if (usersData.success && Array.isArray(usersData.data)) {
        setStaffUsers(usersData.data);
      }
      if (residentsData.success && Array.isArray(residentsData.data)) {
        setAvailableResidents(residentsData.data);
      }
    } catch (err) {
      console.error('Failed to load directory:', err);
    }
  };

  // Restore session strictly if valid session exists; otherwise remain logged out
  useEffect(() => {
    loadDirectory();

    const restoreSession = async () => {
      const savedSession = localStorage.getItem('hsl_auth_session');
      const savedToken = localStorage.getItem('hsl_auth_token');
      const savedResidentId = localStorage.getItem('hsl_resident_id');

      if (savedSession === 'STAFF' && savedToken) {
        try {
          const res = await fetch('/api/rover/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          const data = await res.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
            setToken(savedToken);
            setSessionType('STAFF');
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Staff session restoration failed:', err);
        }
      } else if (savedSession === 'RESIDENT' && savedResidentId) {
        try {
          const res = await fetch('/api/rover/auth/resident-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ residentId: savedResidentId })
          });
          const data = await res.json();
          if (data.success && data.resident) {
            setCurrentResident(data.resident);
            setSessionType('RESIDENT');
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Resident session restoration failed:', err);
        }
      }

      // No active session — do NOT auto-login. Force login screen!
      setSessionType(null);
      setCurrentUser(null);
      setCurrentResident(null);
      setToken(null);
      localStorage.removeItem('hsl_auth_session');
      localStorage.removeItem('hsl_auth_token');
      localStorage.removeItem('hsl_resident_id');
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const loginStaff = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/rover/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        setToken(data.token);
        setCurrentUser(data.user);
        setSessionType('STAFF');
        localStorage.setItem('hsl_auth_session', 'STAFF');
        localStorage.setItem('hsl_auth_token', data.token);
        return { success: true };
      }
      return { success: false, error: data.error || 'Authentication failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const quickLoginStaff = async (roleOrEmail: string) => {
    try {
      const isEmail = roleOrEmail.includes('@');
      const body = isEmail ? { email: roleOrEmail } : { role: roleOrEmail.toUpperCase() };

      const res = await fetch('/api/rover/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        setToken(data.token);
        setCurrentUser(data.user);
        setSessionType('STAFF');
        localStorage.setItem('hsl_auth_session', 'STAFF');
        localStorage.setItem('hsl_auth_token', data.token);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Quick staff login error:', err);
      return false;
    }
  };

  const loginResident = async (residentIdOrRoom?: string) => {
    try {
      const body = residentIdOrRoom
        ? residentIdOrRoom.length > 5
          ? { residentId: residentIdOrRoom }
          : { roomNumber: residentIdOrRoom }
        : {}; // defaults to Hero Resident Mary Johnson (Room 102)

      const res = await fetch('/api/rover/auth/resident-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success && data.resident) {
        setCurrentResident(data.resident);
        setSessionType('RESIDENT');
        localStorage.setItem('hsl_auth_session', 'RESIDENT');
        localStorage.setItem('hsl_resident_id', data.resident.id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Resident login error:', err);
      return false;
    }
  };

  const logout = () => {
    setSessionType(null);
    setCurrentUser(null);
    setCurrentResident(null);
    setToken(null);
    localStorage.removeItem('hsl_auth_session');
    localStorage.removeItem('hsl_auth_token');
    localStorage.removeItem('hsl_resident_id');
  };

  // Permission checking helper for Staff roles
  const can = (action: 'override' | 'dispatch' | 'enroll' | 'audit' | 'vitals' | 'delete'): boolean => {
    if (!currentUser || sessionType !== 'STAFF') return false;
    if (currentUser.role === 'ADMIN') return true;

    switch (action) {
      case 'dispatch':
      case 'enroll':
      case 'vitals':
      case 'audit':
        return currentUser.role === 'NURSE';
      case 'delete':
      case 'override':
        return false;
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        sessionType,
        currentUser,
        currentResident,
        token,
        staffUsers,
        availableResidents,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        loginStaff,
        quickLoginStaff,
        login: loginStaff,
        quickLogin: quickLoginStaff,
        loginResident,
        logout,
        can
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
