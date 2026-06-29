import ConversationListItems from '@/shared/chat/ConversationListItems';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { ChatInteraction } from '@/shared/chat/chatApi';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

interface PriorConversationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interactions: ChatInteraction[];
  activeInteractionUuid: string | null;
  interventionThreadUuids: Set<string>;
  disabled?: boolean;
  onSelect: (interactionUuid: string) => void;
}

export default function PriorConversationsSheet({
  open,
  onOpenChange,
  interactions,
  activeInteractionUuid,
  interventionThreadUuids,
  disabled = false,
  onSelect,
}: PriorConversationsSheetProps) {
  const pv = usePatientViewStyles();

  const handleSelect = (interactionUuid: string) => {
    onSelect(interactionUuid);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          'max-h-[min(80dvh,28rem)] gap-0 overflow-hidden rounded-t-xl border-x-0 border-b-0 p-0',
          pv.sheetClass,
        )}
        style={pv.sheetStyle}
      >
        <SheetTitle className={cn('px-4 pt-4 pb-2 text-base font-semibold', pv.titleClass)} style={pv.titleStyle}>
          Prior conversations
        </SheetTitle>
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 pb-6 pt-2 space-y-1.5">
          <ConversationListItems
            interactions={interactions}
            activeInteractionUuid={activeInteractionUuid}
            interventionThreadUuids={interventionThreadUuids}
            disabled={disabled}
            onSelect={handleSelect}
            styles={pv}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
