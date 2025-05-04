
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
    generatedPlan: string; // Store as HTML
    createdAt: string; // ISO string date
}

/**
 * Interface for a saved plan, including its generated ID.
 */
export interface SavedPlan extends SavedPlanDetails {
  id: string; // Unique identifier for the saved plan
  updatedAt?: string; // Optional: ISO string date for last update
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
 * Sorts plans by creation date (newest first).
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
            const plans: SavedPlan[] = JSON.parse(storedData);
            // Basic validation: check if it's an array
            if (!Array.isArray(plans)) return [];
            // Sort by createdAt date, newest first
            plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return plans;
        } catch (error) {
            console.error(`Error parsing saved plans for user "${userId}" from localStorage:`, error);
            return [];
        }
    }

    return []; // No plans found for this user
}

/**
 * Retrieves a single saved plan by its ID for a specific user.
 *
 * @param userId - The ID of the user who owns the plan.
 * @param planId - The ID of the plan to retrieve.
 * @returns A promise that resolves to the SavedPlan object or null if not found.
 */
export async function getPlanById(userId: string, planId: string): Promise<SavedPlan | null> {
    const allPlans = await getPlansForUser(userId);
    return allPlans.find(plan => plan.id === planId) || null;
}


/**
 * Saves a new lesson plan to localStorage for a specific user.
 * Generates a unique ID for the plan.
 * Should only be called on the client-side.
 *
 * @param planDetails - The details of the plan to save.
 * @returns A promise that resolves to the newly saved plan with its ID.
 * @throws Error if saving fails.
 */
export async function savePlan(planDetails: SavedPlanDetails): Promise<SavedPlan> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async

    if (typeof window === 'undefined') {
        throw new Error("Cannot save plans outside of a browser environment.");
    }

    const storageKey = getStorageKeyForUser(planDetails.userId);
    const existingPlans = await getPlansForUser(planDetails.userId); // Fetch current plans

    const newPlan: SavedPlan = {
        ...planDetails,
        id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, // Simple unique ID
        createdAt: new Date().toISOString(), // Ensure createdAt is set on save
    };

    const updatedPlans = [newPlan, ...existingPlans]; // Add new plan to the beginning

    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedPlans));
        console.log(`Saved plan with ID "${newPlan.id}" for user "${planDetails.userId}".`);
        return newPlan;
    } catch (error) {
        console.error(`Error saving plan for user "${planDetails.userId}" to localStorage:`, error);
        throw new Error("Failed to save the lesson plan due to storage error.");
    }
}

/**
 * Updates an existing saved lesson plan in localStorage for a specific user.
 * Should only be called on the client-side.
 *
 * @param userId - The ID of the user who owns the plan.
 * @param updatedPlanData - The full updated plan object, including the ID.
 * @returns A promise that resolves when the plan is updated.
 * @throws Error if updating fails or plan not found.
 */
export async function updatePlan(userId: string, updatedPlanData: SavedPlan): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async

    if (typeof window === 'undefined') {
        throw new Error("Cannot update plans outside of a browser environment.");
    }

    if (!updatedPlanData.id) {
        throw new Error("Cannot update plan without an ID.");
    }

    const storageKey = getStorageKeyForUser(userId);
    const existingPlans = await getPlansForUser(userId); // Fetch current plans (already sorted)

    const planIndex = existingPlans.findIndex(plan => plan.id === updatedPlanData.id);

    if (planIndex === -1) {
        console.error(`Plan with ID "${updatedPlanData.id}" not found for user "${userId}". Cannot update.`);
        throw new Error("Plan not found for update.");
    }

    // Create a new array with the updated plan, preserving order potentially
    const updatedPlans = [...existingPlans];
    updatedPlans[planIndex] = {
        ...updatedPlanData,
        updatedAt: new Date().toISOString(), // Set/update the updatedAt timestamp
    };

    // Optional: Re-sort if updatedAt is important for display order later
    // updatedPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedPlans));
        console.log(`Updated plan with ID "${updatedPlanData.id}" for user "${userId}".`);
    } catch (error) {
        console.error(`Error updating plan for user "${userId}" in localStorage:`, error);
        throw new Error("Failed to update the lesson plan due to storage error.");
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
