/**
 * @fileOverview Custom error types for the Firebase integration.
 */

// Defines the context for a Firestore security rule violation.
// This context is used to construct a detailed error message for debugging.
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any; // The data being written/updated
};

/**
 * A custom error class for Firestore permission errors.
 * This error is thrown when a Firestore operation is denied by security rules.
 * It formats a detailed, actionable error message for the developer.
 */
export class FirestorePermissionError extends Error {
  public readonly name = 'FirestorePermissionError';
  public readonly cause: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `
FirestoreError: Missing or insufficient permissions. The following request was denied by Firestore Security Rules:
${JSON.stringify(
  {
    // The context is structured to mimic the information available in the Firestore emulator UI.
    // This helps developers quickly understand the context of the failed request.
    auth: {
      // In a real app, you would populate this with the current user's auth state.
      // For this simulation, we'll leave it as a placeholder.
      uid: '(mock_user_uid)',
      token: { name: '(Mock User)' },
    },
    method: context.operation,
    path: `/databases/(default)/documents/${context.path}`,
    request: {
      // Includes the data that was part of the request, crucial for debugging write/update rules.
      resource: {
        data: context.requestResourceData ?? '(no data)',
      },
    },
  },
  null,
  2
)}
`;
    super(message);
    this.cause = context;

    // This ensures the stack trace is captured correctly.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }
}
