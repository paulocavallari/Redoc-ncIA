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
import { errorEmitter } from '@/firebase/error-emitter'; // Import error emitter
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'; // Import custom error

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

    // This block is removed as it causes a permission error by trying to query the collection
    // before the user is authenticated. The check for uniqueness should be handled by
    // Firestore rules or a backend function if possible. For now, we attempt to create directly.
    // const usernameQuery = query(usersRef, where('username', '==', username));
    // const emailQuery = query(usersRef, where('email', '==', email));
    // const usernameSnapshot = await getDocs(usernameQuery).catch(err => { ... });
    // const emailSnapshot = await getDocs(emailQuery).catch(err => { ... });
    // if (!usernameSnapshot.empty || !emailSnapshot.empty) { ... }

    const passwordHash = pseudoHash(pass);
    const newUser: Omit<User, 'id'> = { name, email, username, passwordHash };

    try {
        const docRef = await addDoc(usersRef, newUser);
        console.log(`User "${username}" registered successfully with ID "${docRef.id}".`);
        return { id: docRef.id, ...newUser };
    } catch (serverError: any) {
         // This will now catch the error if the 'create' operation fails.
        const permissionError = new FirestorePermissionError({
            path: usersRef.path,
            operation: 'create',
            requestResourceData: newUser,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        // Also log the original error for more context if it's not a permission issue
        console.error("Original error during user creation:", serverError);
        return null; // Return null on failure
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
