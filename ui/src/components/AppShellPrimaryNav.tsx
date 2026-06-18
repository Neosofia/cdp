import type { ReactNode } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DEFAULT_CLINICIAN_LIST_FILTERS } from '@/lib/demoPatients';
import { useShellStyles } from '@/lib/shellStyles';
import type { AppRoute, AppSection, PatientAction } from '@/lib/appNavigation';
import type { EntitlementsMap } from '@/lib/appTypes';
import { uiResource } from '@/lib/uiCapability';
import { cn } from '@/lib/utils';

export interface AppShellPrimaryNavProps {
  entitlements: EntitlementsMap;
  showPatientMenu: boolean;
  showClinicianMenu: boolean;
  showStudyUsersMenu: boolean;
  isDashboard: boolean;
  selectedSection: AppSection | null;
  selectedAction: string | null;
  onGoHome: () => void;
  onMenuAction: (section: AppSection, action: string, routeOverrides?: Partial<AppRoute>) => void;
  onNavigatePatient: (action: PatientAction) => void;
  onOpenDebugTestPage: () => void;
}

type NavAction = {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

function wrapMobileClose(node: ReactNode, mobile: boolean): ReactNode {
  if (!mobile) {
    return node;
  }
  return <SheetClose asChild>{node}</SheetClose>;
}

function NavActionButton({
  action,
  mobile,
  className,
}: {
  action: NavAction;
  mobile: boolean;
  className: string;
}) {
  const button = (
    <Button onClick={action.onClick} variant="ghost" className={className}>
      {action.label}
    </Button>
  );
  return <span key={action.key}>{wrapMobileClose(button, mobile)}</span>;
}

export default function AppShellPrimaryNav({
  entitlements,
  showPatientMenu,
  showClinicianMenu,
  showStudyUsersMenu,
  isDashboard,
  selectedSection,
  selectedAction,
  onGoHome,
  onMenuAction,
  onNavigatePatient,
  onOpenDebugTestPage,
}: AppShellPrimaryNavProps) {
  const {
    isCorporate,
    mainNavLinkClass,
    menuTriggerClass,
    menuContentClass,
    menuContentStyle,
    menuItemButtonClass,
  } = useShellStyles();

  const actions: NavAction[] = [];

  if (entitlements[uiResource('Menu', 'debug')]) {
    actions.push({
      key: 'debug-api',
      label: 'Test API endpoints',
      active: selectedSection === 'Debug' && selectedAction === 'Test API endpoints',
      onClick: onOpenDebugTestPage,
    });
  }

  if (showStudyUsersMenu) {
    actions.push({
      key: 'study-users',
      label: 'Users',
      active: selectedSection === 'Admin' && selectedAction === 'Users',
      onClick: () => onMenuAction('Admin', 'Users'),
    });
  }

  if (entitlements[uiResource('Menu', 'operator')]) {
    actions.push(
      {
        key: 'admin-services',
        label: 'Services',
        active: selectedSection === 'Admin' && selectedAction === 'Services',
        onClick: () => onMenuAction('Admin', 'Services'),
      },
      {
        key: 'admin-users',
        label: 'Users',
        active: selectedSection === 'Admin' && selectedAction === 'Users',
        onClick: () => onMenuAction('Admin', 'Users'),
      },
    );
  }

  if (showPatientMenu) {
    actions.push(
      {
        key: 'patient-dashboard',
        label: 'Dashboard',
        active: isDashboard,
        onClick: onGoHome,
      },
      {
        key: 'patient-chat',
        label: 'Chat',
        active: selectedSection === 'Patient' && selectedAction === 'Chat',
        onClick: () => onNavigatePatient('Chat'),
      },
      {
        key: 'patient-profile',
        label: 'Profile',
        active: selectedSection === 'Patient' && selectedAction === 'Profile',
        onClick: () => onNavigatePatient('Profile'),
      },
    );
  }

  if (showClinicianMenu) {
    actions.push(
      {
        key: 'clinician-dashboard',
        label: 'Dashboard',
        active: isDashboard,
        onClick: onGoHome,
      },
      {
        key: 'clinician-patients',
        label: 'Patients',
        active: selectedSection === 'Clinician' && selectedAction === 'Patients',
        onClick: () =>
          onMenuAction('Clinician', 'Patients', {
            clinicianPatientUuid: null,
            clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
          }),
      },
    );
  }

  if (actions.length === 0) {
    return null;
  }

  const mobileItemClass = (active: boolean) =>
    cn(
      'w-full justify-start rounded-xl px-3 py-2.5 text-sm font-semibold tracking-wide uppercase',
      isCorporate
        ? active
          ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
        : active
          ? 'text-cyan-300 bg-cyan-500/10'
          : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300',
    );

  const sheetPanelClass = isCorporate
    ? 'w-80 border-slate-200 bg-white p-4'
    : 'w-80 border-cyan-500/20 bg-[#05050f] p-4';
  const sheetTitleClass = isCorporate
    ? 'text-sm font-semibold uppercase tracking-widest text-slate-500'
    : 'text-sm font-semibold uppercase tracking-widest text-cyan-500/60';
  const hamburgerClass = isCorporate
    ? 'rounded-lg p-2 text-slate-700 hover:bg-slate-100'
    : 'rounded-lg p-2 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300';

  const showDebugDropdown = entitlements[uiResource('Menu', 'debug')];
  const showAdminDropdown = entitlements[uiResource('Menu', 'operator')];

  return (
    <>
      <NavigationMenu className="hidden max-w-max flex-none justify-end md:flex" viewport={false}>
        <NavigationMenuList className="flex-none justify-end gap-1">
          {showDebugDropdown && (
            <NavigationMenuItem>
              <NavigationMenuTrigger className={menuTriggerClass}>Debug</NavigationMenuTrigger>
              <NavigationMenuContent className={cn(menuContentClass, 'min-w-65')} style={menuContentStyle}>
                <div className="space-y-1">
                  <Button onClick={onOpenDebugTestPage} variant="ghost" className={menuItemButtonClass}>
                    Test API endpoints
                  </Button>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          )}
          {showStudyUsersMenu && (
            <NavigationMenuItem>
              <Button
                onClick={() => onMenuAction('Admin', 'Users')}
                variant="ghost"
                className={mainNavLinkClass(selectedSection === 'Admin' && selectedAction === 'Users')}
              >
                Users
              </Button>
            </NavigationMenuItem>
          )}
          {showAdminDropdown && (
            <NavigationMenuItem>
              <NavigationMenuTrigger className={menuTriggerClass}>Admin</NavigationMenuTrigger>
              <NavigationMenuContent className={menuContentClass} style={menuContentStyle}>
                <div className="space-y-1">
                  <Button
                    onClick={() => onMenuAction('Admin', 'Services')}
                    variant="ghost"
                    className={menuItemButtonClass}
                  >
                    Services
                  </Button>
                  <Button
                    onClick={() => onMenuAction('Admin', 'Users')}
                    variant="ghost"
                    className={menuItemButtonClass}
                  >
                    Users
                  </Button>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          )}
          {showPatientMenu && (
            <>
              <NavigationMenuItem>
                <Button onClick={onGoHome} variant="ghost" className={mainNavLinkClass(isDashboard)}>
                  Dashboard
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  onClick={() => onNavigatePatient('Chat')}
                  variant="ghost"
                  className={mainNavLinkClass(selectedSection === 'Patient' && selectedAction === 'Chat')}
                >
                  Chat
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  onClick={() => onNavigatePatient('Profile')}
                  variant="ghost"
                  className={mainNavLinkClass(selectedSection === 'Patient' && selectedAction === 'Profile')}
                >
                  Profile
                </Button>
              </NavigationMenuItem>
            </>
          )}
          {showClinicianMenu && (
            <>
              <NavigationMenuItem>
                <Button onClick={onGoHome} variant="ghost" className={mainNavLinkClass(isDashboard)}>
                  Dashboard
                </Button>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Button
                  onClick={() =>
                    onMenuAction('Clinician', 'Patients', {
                      clinicianPatientUuid: null,
                      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
                    })
                  }
                  variant="ghost"
                  className={mainNavLinkClass(selectedSection === 'Clinician' && selectedAction === 'Patients')}
                >
                  Patients
                </Button>
              </NavigationMenuItem>
            </>
          )}
        </NavigationMenuList>
      </NavigationMenu>

      <div className="md:hidden" data-testid="app-shell-mobile-nav">
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className={hamburgerClass} aria-label="Open menu">
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className={cn('overflow-y-auto', sheetPanelClass)}>
            <SheetTitle className={sheetTitleClass}>Menu</SheetTitle>
            <div className="mt-4 space-y-1">
              {actions.map((action) => (
                <NavActionButton
                  key={action.key}
                  action={action}
                  mobile
                  className={mobileItemClass(action.active)}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
