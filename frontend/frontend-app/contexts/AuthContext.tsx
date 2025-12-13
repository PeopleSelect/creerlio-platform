'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'Talent' | 'Business';
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    const userDataStr = localStorage.getItem('userData');

    if (token && userDataStr) {
      try {
        // Parse stored user data
        const userData = JSON.parse(userDataStr);
        setUser({
          id: userData.id || userData.userId || 'temp-id',
          email: userData.email || '',
          firstName: userData.firstName || userData.fullName?.split(' ')[0] || 'User',
          lastName: userData.lastName || userData.fullName?.split(' ').slice(1).join(' ') || '',
          userType: (userType as 'Talent' | 'Business') || 'Talent',
          fullName: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Clear invalid data
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('userType');
      }
    }
    
    setLoading(false);
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    localStorage.removeItem('userData');
    window.location.href = '/auth/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
