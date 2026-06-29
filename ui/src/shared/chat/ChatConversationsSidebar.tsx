import ConversationListItems from '@/shared/chat/ConversationListItems';
import PriorConversationsSheet from '@/shared/chat/PriorConversationsSheet';
import type { ChatInteraction } from '@/shared/chat/chatApi';
import type { PatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

export interface ChatConversationsSidebarProps {
  styles: PatientViewStyles;
  interactions: ChatInteraction[];
  activeInteractionUuid: string | null;
  interventionThreadUuids: Set<string>;
  disabled: boolean;
  onSelect: (interactionUuid: string) => void;
  conversationsOpen: boolean;
  onConversationsOpenChange: (open: boolean) => void;
  showDesktopSidebar: boolean;
  showConversationsPicker: boolean;
}

export default function ChatConversationsSidebar({
  styles: pv,
  interactions,
  activeInteractionUuid,
  interventionThreadUuids,
  disabled,
  onSelect,
  conversationsOpen,
  onConversationsOpenChange,
  showDesktopSidebar,
  showConversationsPicker,
}: ChatConversationsSidebarProps) {
  const sidebar = showDesktopSidebar ? (
    <div className={pv.conversationsPanelWrapClass}>
      <aside className={pv.conversationsPanelClass} style={pv.conversationsPanelStyle}>
        <div className={pv.conversationsPanelHeaderClass} style={pv.conversationsPanelHeaderStyle}>
          <p className={cn('text-xs font-semibold uppercase tracking-widest', pv.mutedText)}>Conversations</p>
        </div>
        <nav className={pv.conversationsPanelNavClass}>
          <ConversationListItems
            interactions={interactions}
            activeInteractionUuid={activeInteractionUuid}
            interventionThreadUuids={interventionThreadUuids}
            disabled={disabled}
            onSelect={onSelect}
            styles={pv}
          />
        </nav>
      </aside>
    </div>
  ) : null;

  const sheet = showConversationsPicker ? (
    <PriorConversationsSheet
      open={conversationsOpen}
      onOpenChange={onConversationsOpenChange}
      interactions={interactions}
      activeInteractionUuid={activeInteractionUuid}
      interventionThreadUuids={interventionThreadUuids}
      disabled={disabled}
      onSelect={onSelect}
    />
  ) : null;

  return (
    <>
      {sidebar}
      {sheet}
    </>
  );
}
