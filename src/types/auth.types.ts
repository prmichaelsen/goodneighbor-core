// src/types/auth.types.ts

/**
 * Firebase custom claims attached to user tokens.
 * Used for role-based access control.
 */
export interface CustomClaims {
  isOwnerOf?: string[];
  isOverseerOf?: string[];
  [key: string]: any;
}

/**
 * Server-side representation of an authenticated user.
 * Derived from verifying a Firebase session cookie.
 */
export interface ServerUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  customClaims: CustomClaims;
}

/**
 * Server session containing the authenticated user and session metadata.
 */
export interface ServerSession {
  user: ServerUser;
  expiresAt: string;
  createdAt: string;
}

/**
 * Result of an authentication operation (login, session verification).
 */
export interface AuthResult {
  success: boolean;
  user?: ServerUser;
  session?: ServerSession;
  error?: string;
}
