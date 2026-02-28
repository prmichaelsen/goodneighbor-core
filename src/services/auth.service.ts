// src/services/auth.service.ts
// AuthService wraps Firebase Admin Auth for session verification and role checking.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { ServerUser, CustomClaims } from '../types/auth.types';
import type { AuthConfig, AppConfig } from '../config/schema';
import { UnauthorizedError, ForbiddenError } from '../errors/app-errors';

export interface AuthServiceDeps {
  auth: {
    verifySessionCookie(sessionCookie: string, checkRevoked: boolean): Promise<Record<string, unknown>>;
  };
  authConfig: AuthConfig;
  appConfig: AppConfig;
}

export class AuthService {
  private auth: AuthServiceDeps['auth'];
  private authConfig: AuthConfig;
  private appConfig: AppConfig;

  constructor(deps: AuthServiceDeps) {
    this.auth = deps.auth;
    this.authConfig = deps.authConfig;
    this.appConfig = deps.appConfig;
  }

  async verifySession(sessionCookie: string): Promise<Result<ServerUser, UnauthorizedError>> {
    try {
      const decoded = await this.auth.verifySessionCookie(sessionCookie, true);
      const sessionDurationMs = this.authConfig.sessionDurationDays * 24 * 60 * 60 * 1000;
      const authTimeMs = (decoded.auth_time as number) * 1000;

      if (Date.now() - authTimeMs > sessionDurationMs) {
        return err(new UnauthorizedError('Session expired'));
      }

      const serverUser: ServerUser = {
        uid: decoded.uid as string,
        email: (decoded.email as string) ?? '',
        emailVerified: (decoded.email_verified as boolean) ?? false,
        displayName: decoded.name as string | undefined,
        photoURL: decoded.picture as string | undefined,
        customClaims: {
          isOwnerOf: (decoded.isOwnerOf as string[]) ?? [],
          isOverseerOf: (decoded.isOverseerOf as string[]) ?? [],
        },
      };
      return ok(serverUser);
    } catch {
      return err(new UnauthorizedError('Invalid session cookie'));
    }
  }

  isOwner(claims: CustomClaims, appName: string): boolean {
    return Array.isArray(claims.isOwnerOf) && claims.isOwnerOf.includes(appName);
  }

  isOverseer(claims: CustomClaims, appName: string): boolean {
    return Array.isArray(claims.isOverseerOf) && claims.isOverseerOf.includes(appName);
  }

  async requireOwner(sessionCookie: string): Promise<Result<ServerUser, UnauthorizedError | ForbiddenError>> {
    const sessionResult = await this.verifySession(sessionCookie);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    const user = sessionResult.value;
    if (!this.isOwner(user.customClaims, this.appConfig.appName)) {
      return err(new ForbiddenError('User is not an owner'));
    }

    return ok(user);
  }
}
