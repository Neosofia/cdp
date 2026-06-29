import { UserGroupIcon } from '@heroicons/react/24/outline';

import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';

export default function StudyDashboard() {
  const { isCorporate } = useUiTheme();

  return (
    <div
      className={cn(
        'rounded-xl p-8 text-center',
        isCorporate && 'border border-slate-300 bg-white text-slate-800 shadow-sm',
      )}
      style={
        isCorporate
          ? undefined
          : {
              background: 'rgba(34,211,238,0.03)',
              border: '1px solid rgba(34,211,238,0.12)',
            }
      }
    >
      <UserGroupIcon
        className={cn('h-10 w-10 mx-auto mb-3', isCorporate ? 'text-slate-500' : undefined)}
        style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.4)' }}
      />
      <p className={cn('text-sm', isCorporate ? 'text-slate-800' : 'text-slate-400')}>
        Study operations home. Open{' '}
        <strong className={isCorporate ? 'text-slate-950' : 'text-white'}>Users</strong> in the menu to browse people in your organization (read-only until role management is enabled for study operators).
      </p>
    </div>
  );
}
