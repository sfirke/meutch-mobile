import { randomUUID } from 'expo-crypto';

// Idempotency token sent with POST /items so a retried create cannot make a duplicate.
export function createCreationToken(): string {
  return randomUUID();
}
