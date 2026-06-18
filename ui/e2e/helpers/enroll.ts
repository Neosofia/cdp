import { randomBytes, randomUUID } from 'node:crypto';

export interface EnrollTestPatient {
  displayCode: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Fresh patient identity for each enroll e2e run (display codes are tenant-unique). */
export function uniqueEnrollPatient(): EnrollTestPatient {
  const nonce = randomBytes(6).toString('hex').toUpperCase();
  return {
    displayCode: `E2E-${Date.now()}-${nonce}`,
    firstName: 'E2E',
    lastName: `Patient${nonce.slice(0, 6)}`,
    email: `e2e-${randomUUID()}@example.com`,
  };
}
