
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

// Firestore collection name
const SAVED_PLANS_COLLECTION = 'savedPlans';

/**
 * Interface for the details included when creating a plan.
 */
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
  generatedPlan: string; // Store as HTML
}

/**
 * Interface for a saved plan document stored in Firestore.
 */
export interface SavedPlan extends SavedPlanDetails {
  id: string; // Firestore document ID
  createdAt: Date; // Timestamp
  updatedAt?: Date; // Optional: Timestamp for last update
}

// Helper to convert Firestore snapshot to SavedPlan object
const fromFirestore = (snapshot: QueryDocumentSnapshot<DocumentData>): SavedPlan => {
  const data = snapshot.data();
  return {
    id: snapshot.id,
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
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

/**
 * Retrieves all saved plans for a specific user from Firestore.
 * Sorts plans by creation date (newest first).
 *
 * @param userId - The ID of the user whose plans to retrieve.
 * @returns A promise that resolves to an array of SavedPlan objects.
 */
export async function getPlansForUser(userId: string): Promise<SavedPlan[]> {
  if (!userId) {
    console.warn("User ID is required to fetch plans.");
    return [];
  }
  try {
    const plansRef = collection(db, SAVED_PLANS_COLLECTION);
    const q = query(
      plansRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(fromFirestore);
  } catch (error) {
    console.error(`Error fetching plans for user "${userId}":`, error);
    return [];
  }
}

/**
 * Retrieves a single saved plan by its ID.
 *
 * @param planId - The ID of the plan to retrieve.
 * @returns A promise that resolves to the SavedPlan object or null if not found.
 */
export async function getPlanById(planId: string): Promise<SavedPlan | null> {
  try {
    const planRef = doc(db, SAVED_PLANS_COLLECTION, planId);
    const planSnap = await getDoc(planRef);

    if (planSnap.exists()) {
      return fromFirestore(planSnap as QueryDocumentSnapshot<DocumentData>);
    } else {
      console.warn(`Plan with ID "${planId}" not found.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching plan by ID "${planId}":`, error);
    return null;
  }
}

/**
 * Saves a new lesson plan to Firestore for a specific user.
 *
 * @param planDetails - The details of the plan to save.
 * @returns A promise that resolves to the newly saved plan with its ID.
 * @throws Error if saving fails.
 */
export async function savePlan(planDetails: SavedPlanDetails): Promise<SavedPlan> {
  try {
    const docRef = await addDoc(collection(db, SAVED_PLANS_COLLECTION), {
      ...planDetails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(`Saved plan with ID "${docRef.id}" for user "${planDetails.userId}".`);
    
    // To return the full object, we fetch it back
    const newPlan = await getPlanById(docRef.id);
    if (!newPlan) {
        throw new Error("Failed to retrieve the newly saved plan.");
    }
    return newPlan;

  } catch (error) {
    console.error(`Error saving plan for user "${planDetails.userId}":`, error);
    throw new Error("Failed to save the lesson plan.");
  }
}

/**
 * Updates an existing saved lesson plan in Firestore.
 *
 * @param planId - The ID of the plan to update.
 * @param updatedData - The partial data to update the plan with.
 * @returns A promise that resolves when the plan is updated.
 * @throws Error if updating fails.
 */
export async function updatePlan(planId: string, updatedData: Partial<SavedPlanDetails>): Promise<void> {
  try {
    const planRef = doc(db, SAVED_PLANS_COLLECTION, planId);
    await updateDoc(planRef, {
      ...updatedData,
      updatedAt: serverTimestamp(),
    });
    console.log(`Updated plan with ID "${planId}".`);
  } catch (error) {
    console.error(`Error updating plan with ID "${planId}":`, error);
    throw new Error("Failed to update the lesson plan.");
  }
}

/**
 * Deletes a specific saved plan from Firestore.
 *
 * @param planId - The ID of the plan to delete.
 * @returns A promise that resolves when the plan is deleted.
 * @throws Error if deletion fails.
 */
export async function deletePlan(planId: string): Promise<void> {
  try {
    const planRef = doc(db, SAVED_PLANS_COLLECTION, planId);
    await deleteDoc(planRef);
    console.log(`Deleted plan with ID "${planId}".`);
  } catch (error) {
    console.error(`Error deleting plan with ID "${planId}":`, error);
    throw new Error("Failed to delete the lesson plan.");
  }
}
