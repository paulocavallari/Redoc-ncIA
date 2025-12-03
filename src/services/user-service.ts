
/**
 * @fileOverview Service for handling user authentication and data using Firestore.
 */
'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  getDoc,
  doc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

// In a real app, you'd use a more secure password hashing library like bcrypt
// This is a simple pseudo-hash for demonstration purposes.
const pseudoHash = (password: string): string => {
  return `hashed_${password}`;
};

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
}

const USER_COLLECTION = 'users';
const USER_STORAGE_KEY = 'redocencia_user_session';


const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): User => {
    const data = snapshot.data();
    return {
        id: snapshot.id,
        name: data.name,
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
    };
};

export async function login(username: string, pass: string): Promise<User | null> {
    try {
        const usersRef = collection(db, USER_COLLECTION);
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`Login failed: No user found with username "${username}".`);
            return null;
        }

        const userDoc = querySnapshot.docs[0];
        const user = fromFirestore(userDoc);
        const inputPasswordHash = pseudoHash(pass);

        if (user.passwordHash === inputPasswordHash) {
            console.log(`Login successful for user "${username}".`);
            return user;
        } else {
            console.log(`Login failed: Incorrect password for user "${username}".`);
            return null;
        }
    } catch (error) {
        console.error("Error during login:", error);
        throw new Error("An error occurred during the login process.");
    }
}

export async function register(name: string, email: string, username: string, pass: string): Promise<User | null> {
    try {
        const usersRef = collection(db, USER_COLLECTION);

        // Check if username or email already exists
        const usernameQuery = query(usersRef, where('username', '==', username));
        const emailQuery = query(usersRef, where('email', '==', email));
        const [usernameSnapshot, emailSnapshot] = await Promise.all([getDocs(usernameQuery), getDocs(emailQuery)]);

        if (!usernameSnapshot.empty) {
            console.warn(`Registration failed: Username "${username}" already exists.`);
            return null;
        }
        if (!emailSnapshot.empty) {
            console.warn(`Registration failed: Email "${email}" already exists.`);
            return null;
        }

        const passwordHash = pseudoHash(pass);
        const newUser: Omit<User, 'id'> = { name, email, username, passwordHash };

        const docRef = await addDoc(usersRef, newUser);
        console.log(`User "${username}" registered successfully with ID "${docRef.id}".`);

        return { id: docRef.id, ...newUser };
    } catch (error) {
        console.error("Error during registration:", error);
        throw new Error("An error occurred during the registration process.");
    }
}


export async function getUserById(userId: string): Promise<User | null> {
    try {
        const userRef = doc(db, USER_COLLECTION, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return fromFirestore(userSnap as QueryDocumentSnapshot<DocumentData>);
        } else {
            console.warn(`User with ID "${userId}" not found.`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching user by ID "${userId}":`, error);
        return null;
    }
}

// --- Local Storage Session Management ---

export function saveUserToStorage(user: User): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: user.id }));
        } catch (error) {
            console.error("Failed to save user to localStorage:", error);
        }
    }
}

export function getUserFromStorage(): { id: string } | null {
    if (typeof window !== 'undefined') {
        try {
            const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error("Failed to get user from localStorage:", error);
            return null;
        }
    }
    return null;
}

export function clearUserFromStorage(): void {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(USER_STORAGE_KEY);
    }
}
