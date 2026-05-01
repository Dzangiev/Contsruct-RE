/**
 * Generates a stable unique identifier.
 * Using crypto.randomUUID() for simplicity and collision resistance.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
