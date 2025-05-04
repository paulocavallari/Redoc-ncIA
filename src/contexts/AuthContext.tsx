'use client';

import type { User } from '@/lib/auth';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getUserFromStorage, saveUserToStorage, clearUserFromStorage } from '@/lib/auth';
import React, { createContext, useState, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  login: (username: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, user: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until user is checked
  const router = useRouter();

  useEffect(() => {
    // Check for user in localStorage on initial load
    const storedUser = getUserFromStorage();
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false); // Finished loading
  }, []);

  const login = useCallback(async (username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    const loggedInUser = await apiLogin(username, pass);
    if (loggedInUser) {
      setUser(loggedInUser);
      saveUserToStorage(loggedInUser);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  }, []);

  const register = useCallback(async (name: string, email: string, username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    const registeredUser = await apiRegister(name, email, username, pass);
    if (registeredUser) {
      // Optionally log in the user automatically after registration
      // setUser(registeredUser);
      // saveUserToStorage(registeredUser);
      setIsLoading(false);
      return true;
    }
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsLoading(true);
    apiLogout(); // Simulate logout
    setUser(null);
    clearUserFromStorage();
    router.push('/login'); // Redirect to login after logout
    setIsLoading(false);
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
