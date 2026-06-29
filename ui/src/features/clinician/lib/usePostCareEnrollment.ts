import { useCallback } from 'react';
import {
  enrollPatientInPostCare,
  type PostCareEnrollmentInput,
  type PostCareEnrollmentResult,
} from '@/features/clinician/lib/postCareEnrollment';

export function usePostCareEnrollment(
  token: string | undefined,
  activeActor: string,
  onSuccess?: () => void,
) {
  return useCallback(
    async (input: PostCareEnrollmentInput): Promise<PostCareEnrollmentResult> => {
      if (!token || activeActor !== 'clinician') {
        throw new Error('Sign in as a clinician to enroll patients.');
      }
      const result = await enrollPatientInPostCare(token, activeActor, input);
      onSuccess?.();
      return result;
    },
    [token, activeActor, onSuccess],
  );
}
