import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'ngo' | 'volunteer' | 'admin';
  avatar_url?: string;
  phone?: string;
  organization?: string;
  is_verified?: boolean;
  created_at?: string;
  ngo?: any; // NGO details if user is NGO
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: Partial<User> & { email: string; password: string }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and get current user
    const token = localStorage.getItem('straysafe_token');
    if (token) {
      getCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const getCurrentUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to get current user:', error);
      // Token might be invalid, remove it
      apiService.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.login(email, password);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: Partial<User> & { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const response = await apiService.register(userData);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    signup,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};