
// This file is deprecated and its contents have been moved to src/services/user-service.ts
// It is kept temporarily to avoid breaking imports, but should be removed in a future cleanup.
// All logic now resides in src/services/user-service.ts to centralize database interactions.

console.warn("The file src/lib/auth.ts is deprecated. Please use src/services/user-service.ts instead.");

// You can re-export from the new service to maintain temporary compatibility
export * from '@/services/user-service';
