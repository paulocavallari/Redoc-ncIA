
'use client';

import type { User } from '@/services/user-service';
import { login as apiLogin, register as apiRegister, getUserById, saveUserToStorage, clearUserFromStorage, getUserFromStorage } from '@/services/user-service';
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

   useEffect(() => {
    // Check for user in localStorage on initial load to maintain session
    const checkUserSession = async () => {
        const storedUser = getUserFromStorage();
        if (storedUser?.id) {
            // Re-validate user with the database
            const freshUser = await getUserById(storedUser.id);
            if (freshUser) {
                setUser(freshUser);
            } else {
                // User doesn't exist in DB anymore, clear local session
                clearUserFromStorage();
            }
        }
        setIsLoading(false);
    };
    checkUserSession();
   }, []);


  const login = useCallback(async (username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
        const loggedInUser = await apiLogin(username, pass);
        if (loggedInUser) {
          setUser(loggedInUser);
          saveUserToStorage(loggedInUser); // Persist session locally
          return true;
        }
        return false;
    } catch (error) {
        console.error("AuthContext Login Error:", error);
        return false;
    } finally {
        setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, username: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
        const registeredUser = await apiRegister(name, email, username, pass);
        // Returns true if user was created, false if username/email exists
        return !!registeredUser;
    } catch (error) {
        console.error("AuthContext Register Error:", error);
        return false;
    } finally {
        setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsLoading(true);
    setUser(null);
    clearUserFromStorage();
    router.push('/login');
    // A small delay to ensure redirection completes before state changes might affect other components
    setTimeout(() => setIsLoading(false), 50);
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
