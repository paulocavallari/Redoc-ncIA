
/**
 * @fileOverview Service for managing saved lesson plans using Firestore.
 */
'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { EducationLevel } from './escopo-sequencia';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


const SAVED_PLANS_COLLECTION = 'savedPlans';

export interface SavedPlanDetails {
  userId: string;
  level: EducationLevel | '';
  yearSeries: string;
  subject: string;
  bimestre: string;
  knowledgeObject: string;
  contents: string[];
  skills: string[];
  duration: string;
  additionalInstructions?: string;
  generatedPlan: string;
}

export interface SavedPlan extends SavedPlanDetails {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData> | DocumentData): SavedPlan => {
    const data = snapshot.data();
    const id = 'id' in snapshot ? snapshot.id : '';

    const toDateString = (timestamp: any): string | undefined => {
        if (!timestamp) return undefined;
        if (typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toISOString();
        }
        if (typeof timestamp === 'string') {
            return timestamp;
        }
        if (timestamp instanceof Date) {
            return timestamp.toISOString();
        }
        return new Date().toISOString();
    };

    return {
        id,
        userId: data.userId,
        level: data.level,
        yearSeries: data.yearSeries,
        subject: data.subject,
        bimestre: data.bimestre,
        knowledgeObject: data.knowledgeObject,
        contents: data.contents || [],
        skills: data.skills || [],
        duration: data.duration,
        additionalInstructions: data.additionalInstructions,
        generatedPlan: data.generatedPlan,
        createdAt: toDateString(data.createdAt)!,
        updatedAt: toDateString(data.updatedAt),
    };
};

export async function getPlansForUser(userId: string): Promise<SavedPlan[]> {
  if (!userId) return [];
  
  const plansRef = collection(db, SAVED_PLANS_COLLECTION);
  const q = query(
    plansRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q).catch(serverError => {
      const permissionError = new FirestorePermissionError({
          path: plansRef.path,
          operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
  });

  return querySnapshot.docs.map(doc => fromFirestore(doc as QueryDocumentSnapshot<DocumentData>));
}

export async function getPlanById(userId: string, planId: string): Promise<SavedPlan | null> {
  const planRef = doc(db, SAVED_PLANS_COLLECTION, planId);
  const planSnap = await getDoc(planRef).catch(serverError => {
      const permissionError = new FirestorePermissionError({
          path: planRef.path,
          operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
  });

  if (planSnap.exists()) {
      const planData = fromFirestore(planSnap as QueryDocumentSnapshot<DocumentData>);
      if (planData.userId === userId) {
          return planData;
      } else {
          console.warn(`User "${userId}" does not have permission to access plan "${planId}".`);
          // This case should ideally be caught by security rules, but we check here as a safeguard.
          return null;
      }
  } else {
    console.warn(`Plan with ID "${planId}" not found.`);
    return null;
  }
}

export async function savePlan(planDetails: SavedPlanDetails): Promise<SavedPlan> {
  const docData = {
    ...planDetails,
    createdAt: serverTimestamp(),
    updatedAt: null,
  };
  const docRef = await addDoc(collection(db, SAVED_PLANS_COLLECTION), docData).catch(serverError => {
      const permissionError = new FirestorePermissionError({
          path: SAVED_PLANS_COLLECTION,
          operation: 'create',
          requestResourceData: docData,
      });
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
  });

  const newPlanDoc = await getDoc(docRef);
  return fromFirestore(newPlanDoc as DocumentData);
}

export async function updatePlan(userId: string, planToUpdate: SavedPlan): Promise<void> {
  const planRef = doc(db, SAVED_PLANS_COLLECTION, planToUpdate.id);
  
  // First, verify the user has access.
  await getPlanById(userId, planToUpdate.id);

  const updateData = {
      ...planToUpdate,
      updatedAt: serverTimestamp(),
  };
  delete (updateData as any).id; // Do not save the id inside the document

  await updateDoc(planRef, updateData).catch(serverError => {
      const permissionError = new FirestorePermissionError({
          path: planRef.path,
          operation: 'update',
          requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
      throw permissionError;
  });
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
    const planRef = doc(db, SAVED_PLANS_COLLECTION, planId);

    // First, verify the user has access before attempting deletion.
    await getPlanById(userId, planId);
    
    await deleteDoc(planRef).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: planRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
}
