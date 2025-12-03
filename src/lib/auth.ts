// Simulated User Data Store (replace with actual API calls in a real app)
const STORAGE_KEY = 'redocencia_users';
const LOGGED_IN_USER_KEY = 'redocencia_logged_in_user';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string; // In a real app, never store plain passwords
}

// Initialize with default admin user if no users exist
const initializeUsers = (): Record<string, User> => {
  if (typeof window === 'undefined') return {}; // Guard for SSR

  const storedUsers = localStorage.getItem(STORAGE_KEY);
  if (storedUsers) {
    try {
      return JSON.parse(storedUsers);
    } catch (e) {
      console.error("Error parsing users from localStorage", e);
      // Fallback to default if parsing fails
    }
  }

  const defaultUsers: Record<string, User> = {
    admin: {
      id: 'admin-id',
      name: 'Admin User',
      email: 'admin@example.com',
      username: 'admin',
      passwordHash: 'admin', // Simulate hashed password
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
};

// --- Auth Functions ---

export const login = async (username: string, pass: string): Promise<User | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (typeof window === 'undefined') {
    return null; // Cannot log in on the server
  }

  const users = initializeUsers(); // Ensure users are loaded on client
  const user = users[username];

  if (user && user.passwordHash === pass) { // Simple password check (DO NOT use in production)
    return user;
  }
  return null;
};

export const register = async (name: string, email: string, username: string, pass: string): Promise<User | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (typeof window === 'undefined') {
    return null; // Cannot register on the server
  }

  const users = initializeUsers(); // Ensure users are loaded on client

  if (users[username]) {
    console.error('Username already exists');
    return null; // Username already exists
  }

  const newUser: User = {
    id: `user-${Date.now()}`, // Simple ID generation
    name,
    email,
    username,
    passwordHash: pass, // Simulate hashing
  };

  users[username] = newUser;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

  return newUser;
};

export const logout = (): void => {
  // In a real app, this might involve clearing tokens or session data
  if (typeof window !== 'undefined') {
    clearUserFromStorage();
  }
  console.log('User logged out');
};

// --- LocalStorage User Persistence ---

export const saveUserToStorage = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOGGED_IN_USER_KEY, JSON.stringify(user));
  }
};

export const getUserFromStorage = (): User | null => {
  if (typeof window === 'undefined') return null;

  const storedUser = localStorage.getItem(LOGGED_IN_USER_KEY);
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (e) {
      console.error("Error parsing logged-in user from localStorage", e);
      return null;
    }
  }
  return null;
};

export const clearUserFromStorage = (): void => {
   if (typeof window !== 'undefined') {
    localStorage.removeItem(LOGGED_IN_USER_KEY);
   }
};
