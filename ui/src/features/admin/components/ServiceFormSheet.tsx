import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUserFormStyles } from '@/components/userFormStyles';
import { cn } from '@/shared/core/utils';

export interface ServiceFormDraft {
  name: string;
  slug: string;
  base_url: string;
}

export const EMPTY_SERVICE_FORM_DRAFT: ServiceFormDraft = {
  name: '',
  slug: '',
  base_url: '',
};

export function serviceToFormDraft(service: {
  name: string;
  slug: string;
  base_url: string;
}): ServiceFormDraft {
  return {
    name: service.name,
    slug: service.slug,
    base_url: service.base_url,
  };
}

export default function ServiceFormSheet({
  open,
  mode,
  draft,
  saving,
  error,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  draft: ServiceFormDraft;
  saving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (patch: Partial<ServiceFormDraft>) => void;
  onSubmit: () => void;
}) {
  const formStyles = useUserFormStyles();
  const isCreate = mode === 'create';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'w-full overflow-y-auto p-6 sm:max-w-md',
          formStyles.isCorporate
            ? 'border-slate-200 bg-white text-slate-900'
            : 'border-slate-700 bg-slate-950 text-slate-300',
        )}
      >
        <SheetHeader className={formStyles.sheetHeaderClass.replace('px-6 pt-6', 'mb-6 pb-4')}>
          <SheetTitle className={formStyles.sheetTitleClass} style={formStyles.sheetTitleStyle}>
            {isCreate ? 'New service' : 'Edit service'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          <div>
            <label className={formStyles.fieldLabelClass}>Name</label>
            <Input
              value={draft.name}
              onChange={(event) => onDraftChange({ name: event.target.value })}
              className={formStyles.inputClass}
              placeholder={isCreate ? 'My Service' : undefined}
            />
          </div>
          <div>
            <label className={formStyles.fieldLabelClass}>Slug</label>
            <Input
              value={draft.slug}
              onChange={(event) => onDraftChange({ slug: event.target.value })}
              className={cn(formStyles.inputClass, 'font-mono')}
              placeholder={isCreate ? 'my-service' : undefined}
            />
          </div>
          <div>
            <label className={formStyles.fieldLabelClass}>Base URL</label>
            <Input
              value={draft.base_url}
              onChange={(event) => onDraftChange({ base_url: event.target.value })}
              className={cn(formStyles.inputClass, 'font-mono')}
              placeholder={isCreate ? 'http://my-service:8000' : undefined}
              type="url"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={onSubmit}
              disabled={saving}
              variant="ghost"
              className={cn('flex-1', formStyles.primaryButtonClass)}
            >
              {saving ? (isCreate ? 'Creating…' : 'Saving…') : isCreate ? 'Create service' : 'Save changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className={formStyles.sheetCancelButtonClass}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
