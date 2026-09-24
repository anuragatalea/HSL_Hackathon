import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types.js';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  staffUsers: User[];
  isLoading: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  quickLogin: (roleOrEmail: string) => Promise<boolean>;
  switchUser: (user: User) => Promise<void>;
  logout: () => void;
  can: (action: 'override' | 'dispatch' | 'enroll' | 'audit' | 'vitals' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hsl_auth_token'));
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch staff list for 1-click role switcher
  const fetchStaffList = async () => {
    try {
      const res = await fetch('/api/rover/auth/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStaffUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  // Restore session from token or perform initial fast login
  useEffect(() => {
    fetchStaffList();

    const restoreSession = async () => {
      const savedToken = localStorage.getItem('hsl_auth_token');
      if (savedToken) {
        try {
          const res = await fetch('/api/rover/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          const data = await res.json();
          if (data.success && data.user) {
            setCurrentUser(data.user);
            setToken(savedToken);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Session restoration failed:', err);
        }
      }

      // Default quick-login as Nurse Sarah for instant demo readiness
      await quickLogin('NURSE');
      setIsLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
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
        localStorage.setItem('hsl_auth_token', data.token);
        setIsAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Authentication failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const quickLogin = async (roleOrEmail: string) => {
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
        localStorage.setItem('hsl_auth_token', data.token);
        setIsAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Quick login error:', err);
      return false;
    }
  };

  const switchUser = async (user: User) => {
    await quickLogin(user.email);
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('hsl_auth_token');
    setIsAuthModalOpen(true);
  };

  // Permission checking helper
  const can = (action: 'override' | 'dispatch' | 'enroll' | 'audit' | 'vitals' | 'delete'): boolean => {
    if (!currentUser) return false;
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
        currentUser,
        token,
        staffUsers,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        login,
        quickLogin,
        switchUser,
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
