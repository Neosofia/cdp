import { UserGroupIcon } from '@heroicons/react/24/outline';
import {
  formatChatInteractionActivityDate,
  formatChatInteractionLabel,
  type ChatInteraction,
} from '@/shared/chat/chatApi';
import { cn } from '@/shared/core/utils';

type ConversationListStyles = {
  mutedText: string;
  conversationActive: string;
  conversationIdle: string;
  conversationIntervention: string;
  careTeamBadgeClass: string;
};

interface ConversationListItemsProps {
  interactions: ChatInteraction[];
  activeInteractionUuid: string | null;
  interventionThreadUuids: Set<string>;
  disabled?: boolean;
  onSelect: (interactionUuid: string) => void;
  styles: ConversationListStyles;
}

export default function ConversationListItems({
  interactions,
  activeInteractionUuid,
  interventionThreadUuids,
  disabled = false,
  onSelect,
  styles,
}: ConversationListItemsProps) {
  return (
    <>
      {interactions.map((interaction) => {
        const isActive = interaction.chat_interaction_uuid === activeInteractionUuid;
        const activityDate = formatChatInteractionActivityDate(interaction);
        const threadHasIntervention = interventionThreadUuids.has(interaction.chat_interaction_uuid);
        return (
          <button
            key={interaction.chat_interaction_uuid}
            type="button"
            onClick={() => onSelect(interaction.chat_interaction_uuid)}
            disabled={disabled}
            className={cn(
              'w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors border',
              isActive
                ? styles.conversationActive
                : threadHasIntervention
                  ? styles.conversationIntervention
                  : styles.conversationIdle,
            )}
          >
            <span className="flex items-start gap-2 min-w-0">
              <span className="block truncate font-medium flex-1 min-w-0">
                {formatChatInteractionLabel(interaction)}
              </span>
              {threadHasIntervention ? (
                <span
                  className={cn(
                    'shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                    styles.careTeamBadgeClass,
                  )}
                  title="Care team is responding in this conversation"
                >
                  <UserGroupIcon className="h-3 w-3" aria-hidden />
                  Care team
                </span>
              ) : null}
            </span>
            {activityDate ? (
              <span className={cn('block text-[10px] mt-1 opacity-60', styles.mutedText)}>{activityDate}</span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}
