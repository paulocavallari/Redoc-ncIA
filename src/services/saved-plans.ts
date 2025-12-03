
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
  try {
    const plansRef = collection(db, SAVED_PLANS_COLLECTION);
    const q = query(
      plansRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => fromFirestore(doc as QueryDocumentSnapshot<DocumentData>));
  } catch (error) {
    console.error(`Error fetching plans for user "${userId}":`, error);
    throw new Error(`Failed to fetch plans: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getPlanById(userId: string, planId: string): Promise<SavedPlan | null> {
  try {
    const planRef = doc(db, SAVED_PLANS_COLLECTION, planId);
    const planSnap = await getDoc(planRef);

    if (planSnap.exists()) {
       const planData = fromFirestore(planSnap as QueryDocumentSnapshot<DocumentData>);
       if (planData.userId === userId) {
            return planData;
       } else {
           console.warn(`User "${userId}" does not have permission to access plan "${planId}".`);
           return null;
       }
    } else {
      console.warn(`Plan with ID "${planId}" not found.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching plan by ID "${planId}":`, error);
    throw new Error(`Failed to fetch plan: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function savePlan(planDetails: SavedPlanDetails): Promise<SavedPlan> {
  try {
    const docData = {
      ...planDetails,
      createdAt: serverTimestamp(),
      updatedAt: null,
    };
    const docRef = await addDoc(collection(db, SAVED_PLANS_COLLECTION), docData);

    console.log(`Saved plan with ID "${docRef.id}" for user "${planDetails.userId}".`);

    const newPlanDoc = await getDoc(docRef);
    return fromFirestore(newPlanDoc as DocumentData);

  } catch (error) {
    console.error(`Error saving plan for user "${planDetails.userId}":`, error);
    throw new Error("Failed to save the lesson plan.");
  }
}

export async function updatePlan(userId: string, planToUpdate: SavedPlan): Promise<void> {
  try {
    const planRef = doc(db, SAVED_PLANS_COLLECTION, planToUpdate.id);
    
    const currentPlan = await getPlanById(userId, planToUpdate.id);
    if (!currentPlan) {
        throw new Error("Plan not found or you don't have permission to update it.");
    }

    const updateData = {
        ...planToUpdate,
        updatedAt: serverTimestamp(),
    };
    delete (updateData as any).id; // Do not save the id inside the document

    await updateDoc(planRef, updateData);
    console.log(`Updated plan with ID "${planToUpdate.id}".`);
  } catch (error) {
    console.error(`Error updating plan with ID "${planToUpdate.id}":`, error);
    throw new Error("Failed to update the lesson plan.");
  }
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  try {
    const planRef = doc(db, SAVED_PLANS_COLLECTION, planId);

    const currentPlan = await getPlanById(userId, planId);
    if (!currentPlan) {
        throw new Error("Plan not found or you don't have permission to delete it.");
    }

    await deleteDoc(planRef);
    console.log(`Deleted plan with ID "${planId}".`);
  } catch (error) {
    console.error(`Error deleting plan with ID "${planId}":`, error);
    throw new Error("Failed to delete the lesson plan.");
  }
}
