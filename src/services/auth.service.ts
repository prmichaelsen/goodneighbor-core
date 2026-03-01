// src/services/auth.service.ts
// AuthService wraps @prmichaelsen/firebase-admin-sdk-v8 for session verification and role checking.

import type { Result } from '../types/result.types';
import { ok, err } from '../types/result.types';
import type { ServerUser, CustomClaims } from '../types/auth.types';
import type { AuthConfig, AppConfig } from '../config/schema';
import { UnauthorizedError, ForbiddenError } from '../errors/app-errors';
import { verifySessionCookie as sdkVerifySessionCookie } from '@prmichaelsen/firebase-admin-sdk-v8';

type VerifySessionCookieFn = (cookie: string, checkRevoked?: boolean) => Promise<Record<string, unknown>>;

export interface AuthServiceDeps {
  authConfig: AuthConfig;
  appConfig: AppConfig;
  /** Override for testing — if not provided, uses the SDK's verifySessionCookie */
  verifySessionCookie?: VerifySessionCookieFn;
}

export class AuthService {
  private authConfig: AuthConfig;
  private appConfig: AppConfig;
  private verifySessionCookieFn: VerifySessionCookieFn;

  constructor(deps: AuthServiceDeps) {
    this.authConfig = deps.authConfig;
    this.appConfig = deps.appConfig;
    this.verifySessionCookieFn = deps.verifySessionCookie
      ?? (sdkVerifySessionCookie as unknown as VerifySessionCookieFn);
  }

  async verifySession(sessionCookie: string): Promise<Result<ServerUser, UnauthorizedError>> {
    try {
      const decoded = await this.verifySessionCookieFn(sessionCookie, true);
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
