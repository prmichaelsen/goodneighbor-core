// src/config/secrets.ts
// Wraps sensitive values to prevent accidental exposure in logs or serialization.

/**
 * Wraps a sensitive string value to prevent accidental exposure.
 * toString() and toJSON() return "[REDACTED]" instead of the actual value.
 * Use reveal() to access the underlying value when needed (e.g., for API calls).
 */
export class Secret<T extends string = string> {
  private readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  /** Returns the actual secret value. */
  reveal(): T {
    return this.value;
  }

  /** Returns "[REDACTED]" to prevent accidental logging. */
  toString(): string {
    return '[REDACTED]';
  }

  /** Returns "[REDACTED]" to prevent accidental JSON serialization. */
  toJSON(): string {
    return '[REDACTED]';
  }

  /** Custom inspect for Node.js util.inspect (used by console.log). */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return '[REDACTED]';
  }
}
