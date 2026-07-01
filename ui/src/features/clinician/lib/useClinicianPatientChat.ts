import { useCallback, useEffect, useState } from 'react';
import {
  chatDisplayHasClinician,
  createChatMessage,
  interactionsWithIntervention,
  listChatInteractions,
  loadPatientChatHistory,
  toChatDisplayMessage,
  type ChatDisplayMessage,
  type ChatInteraction,
} from '@/shared/chat/chatApi';
import { toUserFacingError } from '@/shared/core/userFacingError';

export function useClinicianPatientChat({
  token,
  activeActor,
  patientUuid,
  clinicianUuid,
  episodeStatus,
}: {
  token: string;
  activeActor: string;
  patientUuid: string;
  clinicianUuid?: string | null;
  episodeStatus: string;
}) {
  const [interactions, setInteractions] = useState<ChatInteraction[]>([]);
  const [activeInteractionUuid, setActiveInteractionUuid] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<ChatDisplayMessage[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(true);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [interventionThreadUuids, setInterventionThreadUuids] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setTranscriptLoading(true);
    setTranscriptError(null);
    setInteractions([]);
    setActiveInteractionUuid(null);
    setTranscript([]);

    const loadInteractions = async () => {
      try {
        const items = await listChatInteractions(token, activeActor, patientUuid);
        if (cancelled) return;
        setInteractions(items);
        const selectedUuid = items[0]?.chat_interaction_uuid ?? null;
        setActiveInteractionUuid(selectedUuid);
        if (!selectedUuid) {
          setTranscriptLoading(false);
        }
      } catch (error) {
        if (cancelled) return;
        setTranscriptError(toUserFacingError(error, 'Failed to load conversations'));
        setTranscriptLoading(false);
      }
    };

    void loadInteractions();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid]);

  useEffect(() => {
    if (interactions.length < 2) {
      return;
    }

    let cancelled = false;
    const interactionUuids = interactions.map((interaction) => interaction.chat_interaction_uuid);

    void interactionsWithIntervention(token, activeActor, patientUuid, interactionUuids).then(
      (engaged) => {
        if (!cancelled) {
          setInterventionThreadUuids(engaged);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [interactions, token, activeActor, patientUuid]);

  useEffect(() => {
    if (!activeInteractionUuid || !chatDisplayHasClinician(transcript)) {
      return;
    }
    setInterventionThreadUuids((previous) => {
      if (previous.has(activeInteractionUuid)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(activeInteractionUuid);
      return next;
    });
  }, [transcript, activeInteractionUuid]);

  useEffect(() => {
    setComposeError(null);
  }, [activeInteractionUuid]);

  useEffect(() => {
    if (!activeInteractionUuid) {
      return;
    }

    let cancelled = false;
    setTranscriptLoading(true);
    setTranscriptError(null);

    const loadTranscript = async () => {
      try {
        const lines = await loadPatientChatHistory(
          token,
          activeActor,
          patientUuid,
          activeInteractionUuid,
        );
        if (cancelled) return;
        setTranscript(lines);
      } catch (error) {
        if (cancelled) return;
        setTranscriptError(toUserFacingError(error, 'Failed to load chat transcript'));
        setTranscript([]);
      } finally {
        if (!cancelled) setTranscriptLoading(false);
      }
    };

    void loadTranscript();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, activeInteractionUuid, patientUuid]);

  const handleSendClinicianMessage = useCallback(
    async (content: string) => {
      if (!activeInteractionUuid || !clinicianUuid) {
        return;
      }
      setComposeError(null);
      setSendingReply(true);
      try {
        const created = await createChatMessage(token, activeActor, patientUuid, activeInteractionUuid, {
          sender_type: 'clinician',
          sender_uuid: clinicianUuid,
          content,
        });
        if (!created) {
          throw new Error('Chat service is not configured');
        }
        setTranscript((previous) => [...previous, toChatDisplayMessage(created)]);
        setInteractions((previous) =>
          previous.map((interaction) =>
            interaction.chat_interaction_uuid === activeInteractionUuid
              ? {
                  ...interaction,
                  message_count: interaction.message_count + 1,
                  last_message_at: created.created_at,
                  preview: content,
                }
              : interaction,
          ),
        );
      } catch (sendError) {
        setComposeError(toUserFacingError(sendError, 'Failed to send reply'));
      } finally {
        setSendingReply(false);
      }
    },
    [activeInteractionUuid, activeActor, clinicianUuid, patientUuid, token],
  );

  const canCompose = Boolean(activeInteractionUuid && clinicianUuid && episodeStatus === 'active');

  return {
    interactions,
    activeInteractionUuid,
    setActiveInteractionUuid,
    transcript,
    transcriptLoading,
    transcriptError,
    composeError,
    sendingReply,
    interventionThreadUuids,
    handleSendClinicianMessage,
    canCompose,
  };
}
