
/**
 * @fileOverview Service for managing saved lesson plans using localStorage.
 */

import type { EducationLevel } from './escopo-sequencia';

// Base storage key for saved plans, specific to each user
const SAVED_PLANS_KEY_PREFIX = 'redocencia_saved_plans_';

/**
 * Interface for the details included when saving a plan.
 */
export interface SavedPlanDetails {
    userId: string; // Identifier for the user who saved the plan
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
    createdAt: string; // ISO string date
}

/**
 * Interface for a saved plan, including its generated ID.
 */
export interface SavedPlan extends SavedPlanDetails {
  id: string; // Unique identifier for the saved plan
}

/**
 * Generates the specific localStorage key for a given user's saved plans.
 * @param userId - The ID of the user.
 * @returns The localStorage key string.
 */
const getStorageKeyForUser = (userId: string): string => {
    return `${SAVED_PLANS_KEY_PREFIX}${userId}`;
};

/**
 * Retrieves all saved plans for a specific user from localStorage.
 * Should only be called on the client-side.
 *
 * @param userId - The ID of the user whose plans to retrieve.
 * @returns A promise that resolves to an array of SavedPlan objects.
 */
export async function getPlansForUser(userId: string): Promise<SavedPlan[]> {
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async

    if (typeof window === 'undefined') {
        console.warn("Attempted to get saved plans outside of a browser environment.");
        return [];
    }

    const storageKey = getStorageKeyForUser(userId);
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
        try {
            const plans = JSON.parse(storedData);
            // Basic validation: check if it's an array
            return Array.isArray(plans) ? plans : [];
        } catch (error) {
            console.error(`Error parsing saved plans for user "${userId}" from localStorage:`, error);
            return [];
        }
    }

    return []; // No plans found for this user
}

/**
 * Saves a new lesson plan to localStorage for a specific user.
 * Generates a unique ID for the plan.
 * Should only be called on the client-side.
 *
 * @param planDetails - The details of the plan to save.
 * @returns A promise that resolves when the plan is saved.
 * @throws Error if saving fails.
 */
export async function savePlan(planDetails: SavedPlanDetails): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async

    if (typeof window === 'undefined') {
        throw new Error("Cannot save plans outside of a browser environment.");
    }

    const storageKey = getStorageKeyForUser(planDetails.userId);
    const existingPlans = await getPlansForUser(planDetails.userId); // Fetch current plans

    const newPlan: SavedPlan = {
        ...planDetails,
        id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, // Simple unique ID
    };

    const updatedPlans = [...existingPlans, newPlan];

    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedPlans));
        console.log(`Saved plan with ID "${newPlan.id}" for user "${planDetails.userId}".`);
    } catch (error) {
        console.error(`Error saving plan for user "${planDetails.userId}" to localStorage:`, error);
        throw new Error("Failed to save the lesson plan due to storage error.");
    }
}

/**
 * Deletes a specific saved plan for a user from localStorage.
 * Should only be called on the client-side.
 *
 * @param userId - The ID of the user who owns the plan.
 * @param planId - The ID of the plan to delete.
 * @returns A promise that resolves when the plan is deleted.
 * @throws Error if deletion fails.
 */
export async function deletePlan(userId: string, planId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate async

    if (typeof window === 'undefined') {
        throw new Error("Cannot delete plans outside of a browser environment.");
    }

    const storageKey = getStorageKeyForUser(userId);
    const existingPlans = await getPlansForUser(userId);

    const updatedPlans = existingPlans.filter(plan => plan.id !== planId);

    // Check if a plan was actually removed
    if (updatedPlans.length === existingPlans.length) {
        console.warn(`Plan with ID "${planId}" not found for user "${userId}". No deletion occurred.`);
        // Optionally throw an error or return false if plan not found
        // throw new Error("Plan not found.");
        return;
    }

    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedPlans));
        console.log(`Deleted plan with ID "${planId}" for user "${userId}".`);
    } catch (error) {
        console.error(`Error deleting plan for user "${userId}" from localStorage:`, error);
        throw new Error("Failed to delete the lesson plan due to storage error.");
    }
}
