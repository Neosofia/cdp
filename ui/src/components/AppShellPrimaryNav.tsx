import type { CSSProperties, ReactNode } from 'react';
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
import { useShellStyles } from '@/shared/app/shellStyles';
import type { PatientAction } from '@/shared/app/appRoutes';
import type { EntitlementsMap } from '@/shared/core/appTypes';
import {
  buildPrimaryNavGroups,
  flattenNavGroups,
  type NavAction,
  type NavGroup,
} from '@/shared/app/primaryNavModel';
import { cn } from '@/shared/core/utils';

export interface AppShellPrimaryNavProps {
  entitlements: EntitlementsMap;
  showPatientMenu: boolean;
  showClinicianMenu: boolean;
  showStudyUsersMenu: boolean;
  pathname: string;
  onGoHome: () => void;
  onGoToPatient: (action: PatientAction) => void;
  onGoToClinicianPatients: () => void;
  onGoToAdminServices: () => void;
  onGoToAdminUsers: () => void;
  onGoToDebugApi: () => void;
}

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

function DesktopNavGroup({
  group,
  mainNavLinkClass,
  menuTriggerClass,
  menuContentClass,
  menuContentStyle,
  menuItemButtonClass,
}: {
  group: NavGroup;
  mainNavLinkClass: (active: boolean) => string;
  menuTriggerClass: string;
  menuContentClass: string;
  menuContentStyle: CSSProperties | undefined;
  menuItemButtonClass: string;
}) {
  if (group.kind === 'link') {
    return (
      <NavigationMenuItem>
        <Button
          onClick={group.action.onClick}
          variant="ghost"
          className={mainNavLinkClass(group.action.active)}
        >
          {group.action.label}
        </Button>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className={menuTriggerClass}>{group.label}</NavigationMenuTrigger>
      <NavigationMenuContent
        className={cn(menuContentClass, group.contentClassName)}
        style={menuContentStyle}
      >
        <div className="space-y-1">
          {group.items.map((item) => (
            <Button key={item.key} onClick={item.onClick} variant="ghost" className={menuItemButtonClass}>
              {item.label}
            </Button>
          ))}
        </div>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

export default function AppShellPrimaryNav(props: AppShellPrimaryNavProps) {
  const {
    mainNavLinkClass,
    mobileNavLinkClass,
    menuTriggerClass,
    menuContentClass,
    menuContentStyle,
    menuItemButtonClass,
    isCorporate,
  } = useShellStyles();

  const groups = buildPrimaryNavGroups(props);
  const actions = flattenNavGroups(groups);

  if (actions.length === 0) {
    return null;
  }

  const sheetPanelClass = isCorporate
    ? 'w-80 border-slate-200 bg-white p-4'
    : 'w-80 border-cyan-500/20 bg-[#05050f] p-4';
  const sheetTitleClass = isCorporate
    ? 'text-sm font-semibold uppercase tracking-widest text-slate-500'
    : 'text-sm font-semibold uppercase tracking-widest text-cyan-500/60';
  const hamburgerClass = isCorporate
    ? 'rounded-lg p-2 text-slate-700 hover:bg-slate-100'
    : 'rounded-lg p-2 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300';

  return (
    <>
      <NavigationMenu className="hidden max-w-max flex-none justify-end md:flex" viewport={false}>
        <NavigationMenuList className="flex-none justify-end gap-1">
          {groups.map((group) => (
            <DesktopNavGroup
              key={group.kind === 'link' ? group.action.key : group.key}
              group={group}
              mainNavLinkClass={mainNavLinkClass}
              menuTriggerClass={menuTriggerClass}
              menuContentClass={menuContentClass}
              menuContentStyle={menuContentStyle}
              menuItemButtonClass={menuItemButtonClass}
            />
          ))}
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
                  className={mobileNavLinkClass(action.active)}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
