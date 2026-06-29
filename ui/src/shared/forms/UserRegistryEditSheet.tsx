import PlatformRolePicker from '@/features/admin/components/PlatformRolePicker';
import UserProfileFields from '@/shared/forms/UserProfileFields';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useUserFormStyles } from '@/components/userFormStyles';
import { rolesInNamespace, rolesOutsideNamespace } from '@/shared/user-registry/roleNamespace';
import type { RoleDefinition } from '@/shared/user-registry/roleCatalogApi';
import { cn } from '@/shared/core/utils';
import type { components } from '@/shared/api/generated/user.schema';

type User = components['schemas']['User'];

/** Draft for PATCH /api/v1/users/{user_uuid} from the tenant user directory. */
export interface UserRegistryEditDraft {
  uuid: string;
  tenant_uuid: string;
  idp_id: string;
  first_name: string;
  last_name: string;
  email: string;
  display_code: string | null;
  roles: string[];
}

export function userToRegistryEditDraft(user: User): UserRegistryEditDraft {
  return {
    uuid: user.uuid,
    tenant_uuid: user.tenant_uuid,
    idp_id: user.idp_id,
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    email: user.email ?? '',
    display_code: user.display_code ?? null,
    roles: [...user.roles],
  };
}

/** Directory edit sheet for user-service rows (operators; includes optional platform role assignment). */
export default function UserRegistryEditSheet({
  open,
  draft,
  tenantLabel,
  saving,
  error,
  assignableRoles,
  roleDefinitions,
  sessionActors,
  showPlatformRoles = true,
  onOpenChange,
  onDraftChange,
  onSubmit,
}: {
  open: boolean;
  draft: UserRegistryEditDraft | null;
  tenantLabel: string;
  saving: boolean;
  error: string | null;
  assignableRoles: string[];
  roleDefinitions: RoleDefinition[];
  sessionActors: string[];
  /** Operator directory only; clinicians edit patients via PatientEditSheet. */
  showPlatformRoles?: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (patch: Partial<UserRegistryEditDraft>) => void;
  onSubmit: () => void;
}) {
  const formStyles = useUserFormStyles();
  const foreignRoles = draft ? rolesOutsideNamespace(draft.roles, 'platform') : [];
  const platformRoles = draft ? rolesInNamespace(draft.roles, 'platform') : [];
  const rolesLocked = foreignRoles.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={formStyles.sheetContentClass}>
        <SheetHeader className={formStyles.sheetHeaderClass}>
          <SheetTitle className={formStyles.sheetTitleClass} style={formStyles.sheetTitleStyle}>
            Edit user
          </SheetTitle>
        </SheetHeader>
        {draft ? (
          <div className={formStyles.sheetBodyClass}>
            <div>
              <label className={formStyles.fieldLabelClass}>User UUID</label>
              <p className={formStyles.monoMutedClass}>{draft.uuid}</p>
            </div>
            <div>
              <label className={formStyles.fieldLabelClass}>Tenant</label>
              <p className={cn('text-sm', formStyles.bodyTextClass)}>{tenantLabel}</p>
            </div>
            <div>
              <label className={formStyles.fieldLabelClass}>IdP ID</label>
              <p className={formStyles.monoMutedClass}>{draft.idp_id}</p>
            </div>
            <UserProfileFields
              idPrefix="registry-edit"
              values={{
                firstName: draft.first_name,
                lastName: draft.last_name,
                email: draft.email,
                displayCode: draft.display_code ?? '',
              }}
              onChange={(patch) =>
                onDraftChange({
                  ...(patch.firstName !== undefined ? { first_name: patch.firstName } : {}),
                  ...(patch.lastName !== undefined ? { last_name: patch.lastName } : {}),
                  ...(patch.email !== undefined ? { email: patch.email } : {}),
                  ...(patch.displayCode !== undefined
                    ? { display_code: patch.displayCode || null }
                    : {}),
                })
              }
            />
            {showPlatformRoles ? (
              <div>
                <label className={formStyles.fieldLabelClass}>Platform roles</label>
                {rolesLocked ? (
                  <>
                    <p className="text-xs text-amber-700 mb-2">
                      This user has organization roles outside the platform namespace. Profile fields
                      can be updated; role assignment is not available from this screen.
                    </p>
                    <p className={cn('text-sm font-mono', formStyles.bodyTextClass)}>
                      {draft.roles.join(', ') || '—'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={cn('text-xs mb-2', formStyles.mutedTextClass)}>
                      Assignable platform roles under your Tier-1 roles (
                      {sessionActors.length > 0 ? sessionActors.join(', ') : 'none on JWT'})
                    </p>
                    <PlatformRolePicker
                      roleCatalog={assignableRoles}
                      roleDefinitions={roleDefinitions}
                      selected={platformRoles}
                      onChange={(roles) => onDraftChange({ roles })}
                      assignerActors={sessionActors}
                      roleNamespacePrefix="platform"
                    />
                  </>
                )}
              </div>
            ) : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className={formStyles.primaryButtonClass}
                disabled={saving}
                onClick={onSubmit}
              >
                {saving ? 'Saving…' : 'Save changes'}
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
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
