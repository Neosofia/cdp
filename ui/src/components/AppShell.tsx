import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheckIcon as Shield, ArrowRightOnRectangleIcon as LogOut, BuildingOfficeIcon as Building } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import AppFooter from '@/components/AppFooter';
import ThemeToggle from '@/components/ThemeToggle';
import AppShellPrimaryNav from '@/components/AppShellPrimaryNav';
import AppShellBreadcrumb from '@/shared/app/AppShellBreadcrumb';
import { useAppShellTrailing } from '@/shared/app/AppShellTrailingContext';
import { useAuthenticatedSession } from '@/shared/session/AuthenticatedSessionContext';
import { useClinicianPatientDetail } from '@/features/clinician/lib/useClinicianPatientDetail';
import { beginLogin } from '@/shared/auth/auth';
import { buildAppBreadcrumbTrail } from '@/shared/app/appBreadcrumbModel';
import { parseClinicianListFilters, clinicianPatientUuidFromPath } from '@/shared/app/appRoutes';
import { useAppPageMeta } from '@/shared/app/useAppPageMeta';
import { useShellStyles } from '@/shared/app/shellStyles';
import { uiResource } from '@/shared/core/uiCapability';
import { cn } from '@/shared/core/utils';

export interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const {
    session,
    navigation,
  } = useAuthenticatedSession();

  const {
    profile,
    initializing,
    entitlements,
    activeActor,
    activeSessionRole,
    sessionRoleChoices,
    demoBootstrapRunning,
    demoBootstrapError,
    demoReLoginRequired,
    handleLogout,
    handleSignInAgain,
    handleSessionRoleChange,
    activeRoleEntitlements,
    tokenInfo,
    sessionTenantUuid,
  } = session;

  const { pathname, search } = useLocation();
  const clinicianListFilters = parseClinicianListFilters(search);
  const clinicianPatientUuid = clinicianPatientUuidFromPath(pathname);
  const { patient: clinicianPatient } = useClinicianPatientDetail(
    tokenInfo?.raw ?? '',
    activeActor,
    sessionTenantUuid,
    clinicianPatientUuid && activeActor === 'clinician' ? clinicianPatientUuid : null,
    profile?.tenant_name,
  );

  const pageMeta = useAppPageMeta({
    activeActor,
    clinicianPatient,
  });
  const showPatientMenu = activeRoleEntitlements[uiResource('Menu', 'patient')];
  const showClinicianMenu = activeRoleEntitlements[uiResource('Menu', 'clinician')];
  const showStudyUsersMenu = activeRoleEntitlements[uiResource('Menu', 'users')];

  const headerTrailing = useAppShellTrailing();
  const {
    isCorporate,
    breadcrumbLinkClass,
    profileMenuSeparatorClass,
    profileMenuSeparatorStyle,
  } = useShellStyles();

  const initials = `${profile?.first_name?.charAt(0) || ''}${profile?.last_name?.charAt(0) || ''}`.toUpperCase();

  const breadcrumbCrumbs = buildAppBreadcrumbTrail({
    pathname,
    clinicianListFilters,
    clinicianPatientDisplayCode: clinicianPatient?.displayCode ?? null,
    adminSectionCrumbIsLink: pageMeta.adminSectionCrumbIsLink,
    onGoHome: navigation.goHome,
    onGoToClinicianPatients: navigation.goToClinicianPatients,
    onGoToDebugApi: navigation.goToDebugApi,
  });

  const showDemoBanner = demoBootstrapRunning || demoBootstrapError || demoReLoginRequired;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <header
        className={cn(
          'fixed top-0 z-50 w-full backdrop-blur-lg border-b',
          isCorporate ? 'bg-white/95 border-slate-200' : undefined,
        )}
        style={
          isCorporate
            ? undefined
            : {
                background: 'rgba(5,5,15,0.92)',
                borderBottom: '1px solid rgba(34,211,238,0.12)',
              }
        }
      >
        <div className="flex h-16 w-full items-center justify-between px-4 md:px-6 lg:px-8">
          {isCorporate ? (
            <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
              <img src="/favicon.svg?v=2" alt="" className="w-7 h-7 shrink-0" aria-hidden="true" />
              <span className="truncate text-sm font-semibold text-slate-900 md:hidden">PD Care</span>
              <span className="truncate text-sm md:text-base font-semibold text-slate-900 hidden md:inline">
                Post Discharge Care Platform
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span
                className="text-xl font-black tracking-wider uppercase"
                style={{
                  fontFamily: "'Orbitron', monospace",
                  background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                SPAWN
              </span>
              <span className="text-sm font-semibold text-slate-400 tracking-widest uppercase border border-slate-600 rounded px-1.5 py-0.5">
                2
              </span>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <AppShellPrimaryNav
              entitlements={entitlements}
              showPatientMenu={showPatientMenu}
              showClinicianMenu={showClinicianMenu}
              showStudyUsersMenu={showStudyUsersMenu}
              pathname={pathname}
              onGoHome={navigation.goHome}
              onGoToPatient={navigation.goToPatient}
              onGoToClinicianPatients={() =>
                navigation.goToClinicianPatients(null, clinicianListFilters)
              }
              onGoToAdminServices={navigation.goToAdminServices}
              onGoToAdminUsers={navigation.goToAdminUsers}
              onGoToDebugApi={navigation.goToDebugApi}
            />

            <div className="shrink-0 min-w-0 md:min-w-44">
              {profile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`${profile.first_name} ${profile.last_name}`}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                      isCorporate ? 'hover:bg-slate-100' : 'hover:bg-cyan-500/5',
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        className={cn(
                          'font-bold text-xs',
                          isCorporate ? 'bg-slate-900 text-white' : 'text-white',
                        )}
                        style={
                          isCorporate
                            ? undefined
                            : { background: 'linear-gradient(135deg, #22d3ee, #a855f7)' }
                        }
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex sm:flex-col sm:items-start sm:text-left gap-0.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'text-sm font-semibold leading-none',
                          isCorporate ? 'text-slate-900' : 'text-white',
                        )}
                      >
                        {profile.first_name} {profile.last_name}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] leading-none',
                          isCorporate ? 'text-slate-500' : undefined,
                        )}
                        style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.6)' }}
                      >
                        {activeSessionRole?.label ??
                          (activeActor
                            ? activeActor.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                            : '')}
                      </span>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className={cn(
                      'w-64 mt-1 rounded-2xl',
                      isCorporate ? 'border border-slate-200 bg-white text-slate-700 shadow-lg' : 'text-slate-300',
                    )}
                    style={
                      isCorporate
                        ? undefined
                        : {
                            background: '#05050f',
                            border: '1px solid rgba(34,211,238,0.18)',
                            boxShadow:
                              '0 0 60px rgba(168,85,247,0.15), 0 20px 40px rgba(0,0,0,0.6)',
                          }
                    }
                    align="end"
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="font-normal flex flex-col space-y-1 p-2">
                        <span
                          className={cn(
                            'text-sm font-semibold leading-none',
                            isCorporate ? 'text-slate-900' : 'text-white',
                          )}
                        >
                          {profile.first_name} {profile.last_name}
                        </span>
                        <span
                          className={cn(
                            'text-xs leading-none mt-0.5',
                            isCorporate ? 'text-slate-600' : 'text-slate-400',
                          )}
                        >
                          {profile.email}
                        </span>
                        {(activeSessionRole ?? activeActor) ? (
                          <span
                            className={cn(
                              'text-xs leading-none mt-1',
                              isCorporate ? 'text-slate-600' : 'text-slate-400',
                            )}
                          >
                            Role:{' '}
                            <span className={isCorporate ? 'text-slate-900 font-medium' : 'text-white'}>
                              {activeSessionRole?.label ??
                                activeActor.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                          </span>
                        ) : null}
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator
                      className={profileMenuSeparatorClass}
                      style={profileMenuSeparatorStyle}
                    />

                    <div className="px-3 py-2 flex items-center justify-between">
                      <div
                        className={cn(
                          'flex items-center gap-1.5 text-xs',
                          isCorporate ? 'text-slate-600' : 'text-slate-500',
                        )}
                      >
                        <Building className="h-3.5 w-3.5" />
                        <span>Organization</span>
                      </div>
                      <span
                        className={cn(
                          'text-xs truncate max-w-30',
                          isCorporate ? 'text-slate-800 font-medium' : undefined,
                        )}
                        style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.8)' }}
                      >
                        {profile.tenant_name}
                      </span>
                    </div>

                    <DropdownMenuSeparator
                      className={profileMenuSeparatorClass}
                      style={profileMenuSeparatorStyle}
                    />

                    {sessionRoleChoices.length > 0 ? (
                      <>
                        <DropdownMenuGroup>
                          <DropdownMenuLabel
                            className={cn(
                              'text-xs font-semibold uppercase tracking-widest',
                              isCorporate ? 'text-slate-500' : undefined,
                            )}
                            style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.45)' }}
                          >
                            Choose your role
                          </DropdownMenuLabel>
                          <div className="space-y-1 px-1.5 pb-1">
                            {sessionRoleChoices.map((choice) => {
                              const selected = choice.id === activeSessionRole?.id;
                              return (
                                <DropdownMenuItem
                                  key={choice.id}
                                  onClick={() => handleSessionRoleChange(choice)}
                                  className={cn(
                                    'flex items-center justify-between cursor-pointer rounded-lg px-2 py-2 text-sm',
                                    isCorporate
                                      ? selected
                                        ? 'text-slate-900 bg-slate-100'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                      : selected
                                        ? 'text-cyan-300'
                                        : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300',
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    <Shield
                                      className="h-4 w-4"
                                      style={
                                        isCorporate
                                          ? undefined
                                          : { color: selected ? '#22d3ee' : undefined }
                                      }
                                    />
                                    <span>{choice.label}</span>
                                  </span>
                                  {selected ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px]"
                                      style={
                                        isCorporate
                                          ? { borderColor: '#94a3b8', color: '#334155' }
                                          : { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee' }
                                      }
                                    >
                                      Active
                                    </Badge>
                                  ) : null}
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator
                          className={profileMenuSeparatorClass}
                          style={profileMenuSeparatorStyle}
                        />
                      </>
                    ) : null}
                    <div className="px-1.5 py-1">
                      <ThemeToggle variant="menuItem" />
                    </div>
                    <DropdownMenuSeparator
                      className={profileMenuSeparatorClass}
                      style={profileMenuSeparatorStyle}
                    />
                    <DropdownMenuItem
                      onClick={() => void handleLogout()}
                      className={cn(
                        'cursor-pointer rounded-lg',
                        isCorporate
                          ? 'text-red-700 hover:text-red-800 hover:bg-red-50'
                          : 'text-red-400 hover:text-red-300 hover:bg-red-950/30',
                      )}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : initializing ? (
                <div className="h-10 w-full rounded-lg" style={{ background: 'rgba(34,211,238,0.08)' }} />
              ) : (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    beginLogin();
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all',
                    isCorporate
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'font-bold uppercase tracking-wider text-white hover:scale-105',
                  )}
                  style={
                    isCorporate
                      ? undefined
                      : {
                          background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
                          boxShadow: '0 0 20px rgba(168,85,247,0.4)',
                        }
                  }
                >
                  {isCorporate ? 'Sign In' : '⚡ Login'}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {showDemoBanner && (
        <div
          className={cn(
            'fixed top-16 z-40 w-full border-b',
            isCorporate ? 'border-slate-200 bg-white/95' : 'border-cyan-500/20',
          )}
          style={isCorporate ? undefined : { background: 'rgba(5,5,15,0.96)' }}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div className={cn('text-sm', isCorporate ? 'text-slate-700' : 'text-slate-300')}>
              {demoBootstrapRunning && 'Setting up your demo workspace…'}
              {!demoBootstrapRunning && demoBootstrapError && (
                <span className={isCorporate ? 'text-red-700' : 'text-red-300'}>
                  Demo setup failed: {demoBootstrapError}
                </span>
              )}
              {!demoBootstrapRunning && !demoBootstrapError && demoReLoginRequired && (
                <span>
                  Demo workspace is ready. Sign out and sign back in so your session roles refresh before using Patient or Clinician views.
                </span>
              )}
            </div>
            {!demoBootstrapRunning && demoReLoginRequired && !demoBootstrapError && (
              <Button
                type="button"
                onClick={handleSignInAgain}
                className={cn(
                  'shrink-0 rounded-lg text-xs font-bold uppercase tracking-wider',
                  isCorporate ? 'bg-slate-900 text-white hover:bg-slate-800' : undefined,
                )}
                style={
                  isCorporate ? undefined : { background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)' }
                }
              >
                Sign in again
              </Button>
            )}
          </div>
        </div>
      )}

      <main
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col min-h-0 px-3 md:px-8',
          showDemoBanner ? 'pt-32' : 'pt-16',
          pageMeta.fillViewport ? 'overflow-hidden pb-0 md:pb-4' : 'overflow-y-auto pb-8',
        )}
      >
        <div
          className={cn(
            'shrink-0',
            pageMeta.showPageHeading
              ? cn('pt-2 pb-2', pageMeta.fillViewport ? 'mb-0 md:mb-4' : 'mb-6')
              : cn('py-3', pageMeta.fillViewport ? 'mb-0 md:mb-3' : 'mb-0'),
          )}
        >
          <div
            className={cn(
              'flex items-center gap-3 min-w-0',
              pageMeta.fillViewport && 'hidden md:flex',
            )}
          >
            <AppShellBreadcrumb
              crumbs={breadcrumbCrumbs}
              linkClassName={breadcrumbLinkClass}
              trailing={headerTrailing}
            />
          </div>

          {pageMeta.showPageHeading ? (
            <h1
              className={cn(
                'text-3xl mb-2',
                pageMeta.fillViewport && 'hidden md:block',
                isCorporate
                  ? 'font-semibold tracking-tight text-slate-900'
                  : 'font-black uppercase tracking-wide',
              )}
              style={
                isCorporate
                  ? undefined
                  : {
                      fontFamily: "'Orbitron', monospace",
                      background: 'linear-gradient(135deg, #22d3ee 10%, #818cf8 55%, #a855f7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 20px rgba(34,211,238,0.3))',
                    }
              }
            >
              {pageMeta.pageTitle}
            </h1>
          ) : null}
          {pageMeta.showPageHeading && pageMeta.pageSubtitle ? (
            <p className={cn('text-sm mt-1', isCorporate ? 'text-slate-600' : 'text-slate-400 font-mono')}>
              {pageMeta.pageSubtitle}
            </p>
          ) : null}
        </div>

        {children}
      </main>
      <AppFooter
        compact={pageMeta.fillViewport}
        className={cn(
          'relative z-10 shrink-0 border-t',
          isCorporate ? 'border-slate-200' : 'border-cyan-500/10',
        )}
      />
    </div>
  );
}
