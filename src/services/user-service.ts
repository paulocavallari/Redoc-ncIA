
/**
 * @fileOverview Service for handling user authentication and data using Firestore.
 */
'use client';

import { db } from '@/firebase'; // Corrected import
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
    const usersRef = collection(db, USER_COLLECTION);
    const q = query(usersRef, where('username', '==', username));

    const querySnapshot = await getDocs(q).catch((serverError) => {
        const permissionError = new FirestorePermissionError({
            path: usersRef.path,
            operation: 'list', // 'list' for collection queries
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        // Return an empty snapshot to handle the flow gracefully, the error is already emitted
        return { empty: true, docs: [] };
    });

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
}

export async function register(name: string, email: string, username: string, pass: string): Promise<User | null> {
    const usersRef = collection(db, USER_COLLECTION);
    const passwordHash = pseudoHash(pass);
    const newUser: Omit<User, 'id'> = { name, email, username, passwordHash };

    try {
        // Directly attempt to create the user.
        const docRef = await addDoc(usersRef, newUser);
        console.log(`User "${username}" registered successfully with ID "${docRef.id}".`);
        return { id: docRef.id, ...newUser };
    } catch (serverError: any) {
        // If the addDoc operation fails due to security rules, create and emit a contextual error.
        const permissionError = new FirestorePermissionError({
            path: usersRef.path,
            operation: 'create',
            requestResourceData: newUser,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        // Throw the contextual error to be caught by the UI and displayed in the dev overlay.
        throw permissionError;
    }
}


export async function getUserById(userId: string): Promise<User | null> {
    const userRef = doc(db, USER_COLLECTION, userId);
    
    const userSnap = await getDoc(userRef).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'get',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });

    if (userSnap && userSnap.exists()) {
        return fromFirestore(userSnap as QueryDocumentSnapshot<DocumentData>);
    } else {
        if(userSnap) console.warn(`User with ID "${userId}" not found.`);
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

/**
 * Ensures the 'admin' user exists in the database.
 * If not, it creates the admin user with a default password.
 */
export async function ensureAdminUserExists(): Promise<void> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', 'admin'));

    try {
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log("Admin user not found, creating one...");
            const adminUser = {
                name: 'Admin',
                email: 'admin@redocencia.com',
                username: 'admin',
                passwordHash: pseudoHash('admin'), // Default password 'admin'
            };
            await addDoc(usersRef, adminUser);
            console.log("Admin user created successfully.");
        } else {
            console.log("Admin user already exists.");
        }
    } catch (error) {
        console.error("Error ensuring admin user exists:", error);
        // We don't rethrow here to avoid blocking app startup if Firestore is temporarily down
        // but we emit a contextual error for debugging.
        const permissionError = new FirestorePermissionError({
            path: usersRef.path,
            operation: 'list', // The initial check is a 'list' operation
            requestResourceData: { query: 'username == admin' },
        });
        errorEmitter.emit('permission-error', permissionError);
    }
}
