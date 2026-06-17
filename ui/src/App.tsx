import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { setupTracing } from './otel';
import ServiceManagement from '@/components/ServiceManagement';
import UserManagement from '@/components/UserManagement';
import Dashboard from '@/components/Dashboard';
import PatientChat from '@/components/PatientChat';
import PatientRecords from '@/components/PatientRecords';
import PatientProfile from '@/components/PatientProfile';
import ClinicianActivePatients, { type EditEnrollmentInput } from '@/components/ClinicianActivePatients';
import AppFooter from '@/components/AppFooter';
import SplashPage from '@/components/SplashPage';
import TermsOfServiceGate from '@/components/TermsOfServiceGate';
import AppShell from '@/components/AppShell';
import DebugApiPanel, { type DebugTestResult } from '@/components/DebugApiPanel';
import BrandBackground from '@/components/BrandBackground';
import StarField from '@/components/StarField';
import {
  activePatientByUuid,
  DEFAULT_CLINICIAN_LIST_FILTERS,
  type ClinicianListFilters,
} from '@/lib/demoPatients';
import {
  DEFAULT_APP_ROUTE,
  dashboardTitleForActor,
  pathForAppRoute,
  readAppRoute,
  replaceAppRoute,
  type AppRoute,
  type PatientAction,
} from '@/lib/appNavigation';
import { useAppRoute } from '@/lib/useAppRoute';
import { usePatientRegistry } from '@/lib/usePatientRegistry';
import { upsertCareEpisodeRecovery } from '@/lib/careEpisodeApi';
import { updatePatientUser } from '@/lib/userRegistryApi';
import { isTosPreviewPath } from '@/lib/tosPreview';
import { useUiTheme } from '@/lib/uiTheme';
import { cn } from '@/lib/utils';
import { useAuthSession } from '@/hooks/useAuthSession';
import { uiResource } from '@/lib/uiCapability';

try {
  setupTracing();
} catch (error) {
  console.warn('OpenTelemetry setup skipped', error);
}

export default function App() {
  const { isCorporate } = useUiTheme();
  const [testResult, setTestResult] = useState<DebugTestResult | null>(null);
  const [clinicianBreadcrumbTrailing, setClinicianBreadcrumbTrailing] = useState<ReactNode>(null);
  const clearTestResult = useCallback(() => setTestResult(null), []);

  const session = useAuthSession({ onBeforeNavigate: clearTestResult });
  const {
    tokenInfo,
    profile,
    initializing,
    activeActor,
    entitlements,
    roleCatalog,
    tosAccepting,
    tosError,
    patientDemoSeedVersion,
    demoBootstrapRunning,
    demoBootstrapError,
    demoReLoginRequired,
    fetchSessionData,
    handleLogout,
    handleSignInAgain,
    handleDeclineTos,
    handleAcceptTos,
    handleSessionRoleChange,
    sessionActors,
    sessionRoleChoices,
    activeSessionRole,
    sessionTenantUuid,
    needsTosAcceptance,
    activeRoleEntitlements,
  } = session;

  const { route, navigate } = useAppRoute();
  const {
    section: selectedSection,
    action: selectedAction,
    clinicianPatientUuid,
    clinicianListFilters,
  } = route;

  const {
    patients: registryPatients,
    registryUsers,
    loading: patientsLoading,
    error: patientsError,
    reload,
    enrollInPostCare,
  } = usePatientRegistry(tokenInfo?.raw, activeActor, sessionTenantUuid, profile?.tenant_name);

  const showPatientMenu = activeRoleEntitlements[uiResource('Menu', 'patient')];
  const showClinicianMenu = activeRoleEntitlements[uiResource('Menu', 'clinician')];
  const showStudyUsersMenu = activeRoleEntitlements[uiResource('Menu', 'users')];
  const isDashboard = !selectedSection && !selectedAction;

  const clinicianPatient = clinicianPatientUuid
    ? activePatientByUuid(registryPatients, clinicianPatientUuid)
    : null;
  const isClinicianPatientList =
    selectedSection === 'Clinician' && selectedAction === 'Patients' && !clinicianPatientUuid;
  const isClinicianPatientDetail =
    Boolean(clinicianPatient) && selectedSection === 'Clinician' && selectedAction === 'Patients';
  const pageTitle =
    clinicianPatient && selectedSection === 'Clinician'
      ? clinicianPatient.displayName
      : (selectedAction ??
        (selectedSection || (isDashboard ? dashboardTitleForActor(activeActor) : 'Dashboard')));
  const pageSubtitle =
    clinicianPatient && selectedSection === 'Clinician'
      ? `${clinicianPatient.displayCode} · ${clinicianPatient.surgery} · Day ${clinicianPatient.daysPostOp} post-op · Recovery ${clinicianPatient.recoveryId}`
      : null;
  const showPageHeading = !isClinicianPatientList && !isClinicianPatientDetail;
  const adminSectionCrumbIsLink = Boolean(selectedAction);

  const applyRoute = useCallback(
    (next: AppRoute, mode: 'push' | 'replace' = 'push') => {
      setTestResult(null);
      navigate(next, mode);
    },
    [navigate],
  );

  useEffect(() => {
    if (isTosPreviewPath()) {
      return;
    }
    const parsed = readAppRoute();
    const canonical = pathForAppRoute(parsed);
    const current = `${window.location.pathname}${window.location.search}`;
    if (canonical !== current) {
      replaceAppRoute(parsed);
    }
  }, []);

  const goHome = () => {
    setTestResult(null);
    applyRoute(DEFAULT_APP_ROUTE);
  };

  const navigateClinicianPatients = (
    patientUuid: string | null = null,
    filters: ClinicianListFilters = clinicianListFilters,
  ) => {
    setTestResult(null);
    applyRoute({
      section: 'Clinician',
      action: 'Patients',
      clinicianPatientUuid: patientUuid,
      clinicianListFilters: filters,
    });
  };

  const navigatePatient = (action: PatientAction) => {
    setTestResult(null);
    applyRoute({
      section: 'Patient',
      action,
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    });
  };

  const handleMenuAction = (section: AppRoute['section'], action: string, routeOverrides?: Partial<AppRoute>) => {
    setTestResult(null);
    applyRoute({
      section,
      action,
      clinicianPatientUuid: routeOverrides?.clinicianPatientUuid ?? null,
      clinicianListFilters: routeOverrides?.clinicianListFilters ?? DEFAULT_CLINICIAN_LIST_FILTERS,
    });
  };

  const openDebugTestPage = () => {
    setTestResult(null);
    applyRoute({
      section: 'Debug',
      action: 'Test API endpoints',
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    });
  };

  const pingApi = async (url: string, label?: string, bearerToken?: string) => {
    const token = bearerToken ?? tokenInfo?.raw;
    if (!token) return;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Active-Actor': activeActor,
        },
      });
      if (res.status === 401) {
        fetchSessionData();
      }
      const data = await res.json();
      setTestResult({ api: label ?? url, data, status: res.status });
    } catch (e: unknown) {
      setTestResult({
        api: label ?? url,
        data: e instanceof Error ? e.message : 'Unknown error',
        status: 500,
      });
    }
  };

  const runDebugTest = async (label: string, url: string) => {
    applyRoute({
      section: 'Debug',
      action: 'Test API endpoints',
      clinicianPatientUuid: null,
      clinicianListFilters: DEFAULT_CLINICIAN_LIST_FILTERS,
    });
    const token = tokenInfo?.raw ?? (await fetchSessionData());
    if (!token) return;
    pingApi(url, label, token);
  };

  /** Full-height layout with internal scroll — not used for lists, records, or TOS. */
  const fillViewport =
    (selectedSection === 'Patient' && selectedAction === 'Chat') ||
    (selectedSection === 'Clinician' &&
      selectedAction === 'Patients' &&
      Boolean(clinicianPatientUuid));

  if (isTosPreviewPath()) {
    return (
      <div
        className={cn(
          'h-dvh flex flex-col overflow-hidden font-sans',
          isCorporate ? 'bg-slate-100' : undefined,
        )}
        style={isCorporate ? undefined : { background: '#05050f' }}
      >
        <TermsOfServiceGate preview displayName="Preview" className="flex-1 min-h-0" />
      </div>
    );
  }

  if (!tokenInfo || !profile) {
    if (initializing) {
      return <BrandBackground />;
    }
    return <SplashPage />;
  }

  if (needsTosAcceptance) {
    const displayName =
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
      profile?.email ||
      'there';
    return (
      <TermsOfServiceGate
        displayName={displayName}
        accepting={tosAccepting}
        errorMessage={tosError}
        onAccept={() => void handleAcceptTos()}
        onDecline={handleDeclineTos}
      />
    );
  }

  const appFooter = (
    <AppFooter
      className={cn(
        'relative z-10 shrink-0 border-t',
        isCorporate ? 'border-slate-200' : 'border-cyan-500/10',
      )}
    />
  );

  return (
    <div
      className={cn(
        'relative flex h-dvh min-h-0 w-full flex-col overflow-hidden font-sans',
        isCorporate ? 'bg-white text-slate-900' : undefined,
      )}
      style={isCorporate ? undefined : { background: '#05050f' }}
    >
      {!isCorporate ? (
        <div className="fixed inset-0 pointer-events-none z-0">
          <StarField />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.05) 50%, transparent 80%)',
            }}
          />
        </div>
      ) : null}

      <AppShell
        profile={profile}
        initializing={initializing}
        entitlements={entitlements}
        activeActor={activeActor}
        activeSessionRole={activeSessionRole ?? null}
        sessionRoleChoices={sessionRoleChoices}
        showPatientMenu={showPatientMenu}
        showClinicianMenu={showClinicianMenu}
        showStudyUsersMenu={showStudyUsersMenu}
        isDashboard={isDashboard}
        selectedSection={selectedSection}
        selectedAction={selectedAction}
        clinicianPatientUuid={clinicianPatientUuid}
        clinicianListFilters={clinicianListFilters}
        clinicianPatientDisplayCode={clinicianPatient?.displayCode ?? null}
        adminSectionCrumbIsLink={adminSectionCrumbIsLink}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
        showPageHeading={showPageHeading}
        demoBootstrapRunning={demoBootstrapRunning}
        demoBootstrapError={demoBootstrapError}
        demoReLoginRequired={demoReLoginRequired}
        fillViewport={fillViewport}
        footer={appFooter}
        onGoHome={goHome}
        onMenuAction={handleMenuAction}
        onNavigatePatient={navigatePatient}
        onNavigateClinicianPatients={navigateClinicianPatients}
        onOpenDebugTestPage={openDebugTestPage}
        onSessionRoleChange={handleSessionRoleChange}
        onLogout={() => void handleLogout()}
        onSignInAgain={handleSignInAgain}
        breadcrumbTrailing={clinicianBreadcrumbTrailing}
      >
        {tokenInfo && (
          <div
            className={cn(
              'w-full',
              fillViewport && 'flex min-h-0 flex-1 flex-col overflow-hidden',
            )}
          >
            {selectedSection === 'Admin' && selectedAction === 'Services' ? (
              <ServiceManagement token={tokenInfo.raw} activeActor={activeActor} />
            ) : selectedSection === 'Admin' && selectedAction === 'Users' ? (
              <UserManagement
                  token={tokenInfo.raw}
                  activeActor={activeActor}
                  sessionActors={sessionActors}
                  roleCatalog={roleCatalog}
                  profileUuid={profile?.uuid}
                  onSelfRolesUpdated={() => {
                    void fetchSessionData();
                  }}
                  sessionTenantUuid={
                    profile?.tenant_uuid ??
                    (typeof tokenInfo.decoded['neosofia:tenant_uuid'] === 'string'
                      ? tokenInfo.decoded['neosofia:tenant_uuid']
                      : null)
                  }
                  entitlements={activeRoleEntitlements}
                />
            ) : selectedSection === 'Patient' && selectedAction === 'Chat' ? (
              <PatientChat
                token={tokenInfo.raw}
                activeActor={activeActor}
                patientName={profile ? `${profile.first_name} ${profile.last_name}` : undefined}
                patientUuid={profile?.uuid}
                tenantName={profile?.tenant_name}
              />
            ) : selectedSection === 'Patient' && selectedAction === 'Profile' && profile ? (
              <PatientProfile
                  firstName={profile.first_name}
                  lastName={profile.last_name}
                  email={profile.email}
                  tenantName={profile.tenant_name}
                  displayCode={profile.display_code}
                  token={tokenInfo.raw}
                  activeActor={activeActor}
                  patientUuid={profile.uuid}
                  onViewAllRecords={() => navigatePatient('Review records')}
                />
            ) : selectedSection === 'Patient' && selectedAction === 'Review records' ? (
              <PatientRecords token={tokenInfo.raw} activeActor={activeActor} patientUuid={profile?.uuid} />
            ) : selectedSection === 'Clinician' && selectedAction === 'Patients' ? (
              <ClinicianActivePatients
                patients={registryPatients}
                registryUsers={registryUsers}
                token={tokenInfo.raw}
                activeActor={activeActor}
                clinicianDisplayName={
                  profile
                    ? `${profile.first_name} ${profile.last_name}`.trim() || profile.email
                    : undefined
                }
                clinicianRoleLabel={activeSessionRole?.label}
                clinicianUuid={profile?.uuid}
                selfUuid={profile?.uuid}
                loading={patientsLoading}
                error={patientsError}
                onRetry={reload}
                selectedPatientUuid={clinicianPatientUuid}
                listFilters={clinicianListFilters}
                onListFiltersChange={(filters) => navigateClinicianPatients(null, filters)}
                onSelectPatient={(patientUuid) => navigateClinicianPatients(patientUuid, clinicianListFilters)}
                tenantUuid={sessionTenantUuid}
                tenantName={profile?.tenant_name}
                onEnrollInPostCare={async (input) => {
                  await enrollInPostCare(input);
                }}
                onEditEnrollment={async (input: EditEnrollmentInput) => {
                  const tenantUuid = input.tenant_uuid || sessionTenantUuid;
                  if (!tenantUuid) {
                    throw new Error('Missing tenant context for patient profile update.');
                  }
                  try {
                    await updatePatientUser(tokenInfo.raw, activeActor, input.patient_uuid, {
                      display_code: input.display_code,
                      first_name: input.first_name,
                      last_name: input.last_name,
                      email: input.email,
                    });
                  } catch (err) {
                    const detail = err instanceof Error ? err.message : String(err);
                    throw new Error(`User registry: ${detail}`);
                  }
                  try {
                    await upsertCareEpisodeRecovery(tokenInfo.raw, activeActor, {
                      patient_uuid: input.patient_uuid,
                      tenant_uuid: tenantUuid,
                      surgery: input.surgery,
                      procedure_date: input.procedure_date,
                      recovery_id: input.recovery_id,
                      risk_level: input.risk_level,
                      care_window_days: input.care_window_days,
                    });
                  } catch (err) {
                    const detail = err instanceof Error ? err.message : String(err);
                    throw new Error(`Care episode: ${detail}`);
                  }
                  reload();
                }}
                onBreadcrumbTrailingChange={setClinicianBreadcrumbTrailing}
              />
            ) : selectedSection === 'Debug' ? (
              <DebugApiPanel
                  tokenInfo={tokenInfo}
                  testResult={testResult}
                  onRunTest={(label, url) => void runDebugTest(label, url)}
                isCorporate={isCorporate}
              />
            ) : (
              <Dashboard
                  activeActor={activeActor}
                  firstName={profile?.first_name}
                  patientToken={tokenInfo.raw}
                  patientUuid={profile?.uuid}
                  patientDemoSeedVersion={patientDemoSeedVersion}
                  patientDemoSeeding={demoBootstrapRunning}
                  operatorToken={tokenInfo.raw}
                  clinicianPatients={registryPatients}
                  clinicianError={patientsError}
                  onClinicianRetry={reload}
                  onPatientGoToProfile={() => navigatePatient('Profile')}
                  onClinicianOpenPatients={navigateClinicianPatients}
                  onOperatorOpenUsers={() => handleMenuAction('Admin', 'Users')}
                  onOperatorOpenServices={() => handleMenuAction('Admin', 'Services')}
                />
            )}
          </div>
        )}
      </AppShell>
    </div>
  );
}
