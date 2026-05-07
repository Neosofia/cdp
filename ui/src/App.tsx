import { useState, useEffect } from 'react';
import { setupTracing } from './otel';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent } from '@/components/ui/navigation-menu';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { jwtDecode } from 'jwt-decode';
import { ShieldCheckIcon as Shield, ChartBarIcon as Activity, FingerPrintIcon as Fingerprint, LockClosedIcon as Lock, Bars3Icon as Menu, ArrowRightOnRectangleIcon as LogOut, BuildingOfficeIcon as Building } from '@heroicons/react/24/outline';
import logo from './assets/Neosofia.png';

// Auth base URL for browser navigations (login/logout redirects).
// In dev this points directly at the auth service; in production it is
// the same origin routed via Traefik's /auth-api prefix.
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? '/auth-api';

// Setup OpenTelemetry right away
setupTracing();

interface LocalOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  organization_name: string;
  roles: string[];
}

export default function App() {
  const [tokenInfo, setTokenInfo] = useState<{ raw: string, decoded: any } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{api: string, data: any, status: number} | null>(null);
  const [activeRole, setActiveRole] = useState<string>('');

  const fetchSessionData = async () => {
    try {
      // Step 1: exchange session cookie for platform JWT
      const tokenRes = await fetch('/auth-api/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=session'
      });

      if (!tokenRes.ok) throw new Error(`Token fetch failed: ${tokenRes.status}`);

      const tokenData: LocalOauthToken = await tokenRes.json();
      if (!tokenData.access_token) throw new Error('No access token in response');

      const decoded: any = jwtDecode(tokenData.access_token);
      const newTokenInfo = { raw: tokenData.access_token, decoded };
      const roles = decoded?.['neosofia:roles'] || [];
      const newRole = roles.length > 0 ? roles[0] : '';

      // Step 2: use the verified JWT to fetch profile — no session unseal on the server
      const profileRes = await fetch('/auth-api/api/profile', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
      });

      const newProfile = profileRes.ok ? await profileRes.json() : null;

      // Single batch update — no intermediate render states
      setTokenInfo(newTokenInfo);
      setProfile(newProfile);
      setActiveRole(newRole);
    } catch (_err) {
      // silently ignore — unauthenticated users will see the login button
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // In a real app we'd also call /auth-api/logout and clear the wos_session
    // For now we just clear the UI cache
    setTokenInfo(null);
    setProfile(null);
    setActiveRole('');
    setTestResult(null);
    window.location.href = `${AUTH_BASE}/login`;
  };

  useEffect(() => {
    fetchSessionData();
  }, []);

  const pingApi = async (url: string) => {
    if (!tokenInfo) return;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokenInfo.raw}`,
          'X-Active-Role': activeRole,
        }
      });
      const data = await res.json();
      setTestResult({ api: url, data, status: res.status });
    } catch (e: any) {
      setTestResult({ api: url, data: e.message, status: 500 });
    }
  };

  const initials = `${profile?.first_name?.charAt(0) || ''}${profile?.last_name?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col font-sans">
      <header className="fixed top-0 z-50 w-full bg-slate-950/90 backdrop-blur-lg border-b border-white/10 shadow-lg">
        <div className="flex h-16 items-center px-4 md:px-6 justify-between max-w-7xl mx-auto">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <Sheet>
              <SheetTrigger className="md:hidden">
                <Menu className="h-5 w-5 text-slate-300" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-slate-950 border-white/10">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <img src={logo} alt="Neosofia" className="h-7 object-contain" />
                  </SheetTitle>
                </SheetHeader>
                <div className="py-6 flex flex-col gap-1">
                  <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <Activity className="h-4 w-4" /> Dashboard
                  </button>
                </div>
              </SheetContent>
            </Sheet>

            <img src={logo} alt="Neosofia Logo" className="h-8 md:h-9 object-contain" />

            <NavigationMenu className="hidden md:flex" viewport={false}>
              <NavigationMenuList className="gap-1">
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-slate-300 hover:text-white data-open:text-white">
                    Dashboards
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="min-w-52 rounded-2xl border border-white/10 bg-slate-950 text-slate-300 p-2 shadow-2xl shadow-black/40">
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Clinical</p>
                      <button className="w-full text-left text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg px-3 py-2 transition-colors">
                        Recent Activity
                      </button>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* User Profile Area */}
          <div className="flex items-center gap-3">
            {profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#0D4884] text-white font-semibold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex sm:flex-col sm:items-start sm:text-left gap-0.5">
                      <span className="text-sm font-semibold text-white leading-none">
                        {profile.first_name} {profile.last_name}
                      </span>
                      <span className="text-[11px] text-slate-400 leading-none">
                        {profile.organization_name}
                      </span>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 mt-1 bg-slate-950 border border-white/10 text-slate-300 shadow-2xl shadow-black/40 rounded-2xl" align="end">
                  {/* Identity */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal flex flex-col space-y-1 p-2">
                      <span className="text-sm font-semibold leading-none text-white">{profile.first_name} {profile.last_name}</span>
                      <span className="text-xs text-slate-400 leading-none mt-0.5">{profile.email}</span>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-white/10" />

                  {/* Organization */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Building className="h-3.5 w-3.5" />
                      <span>Organization</span>
                    </div>
                    <span className="text-xs text-slate-300 truncate max-w-[120px]">{profile.organization_name}</span>
                  </div>

                  <DropdownMenuSeparator className="bg-white/10" />

                  {/* Role picker */}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Active Role
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={activeRole} onValueChange={setActiveRole}>
                      {profile.roles.map(role => (
                        <DropdownMenuRadioItem key={role} value={role} className="cursor-pointer text-slate-300 hover:text-white hover:bg-white/5 rounded-lg">
                          <span className="flex items-center">
                            <Shield className="mr-2 h-4 w-4 text-slate-500" />
                            <span className="capitalize">{role.replace(/-/g, ' ')}</span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded-lg">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : loading ? (
               null
            ) : (
              <a
                href={`${AUTH_BASE}/login`}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-[#9B0303] hover:bg-[#7a0202] transition-colors"
              >
                Log in
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 pb-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl tracking-tight font-bold mb-2" style={{color: '#9B0303'}}>Development Dashboard</h1>
          <p className="text-slate-500 text-lg">Test API connectivity and debug JWT claims.</p>
        </div>

        {tokenInfo && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-slate-200 shadow-sm col-span-2 gap-0 py-0">
              <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5" style={{color: '#0D4884'}} /> API Playground
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                  <Button
                    onClick={() => pingApi('/auth-api/api/token-inspect')}
                    className="w-full sm:w-auto bg-[#0D4884] hover:bg-[#0a3a6e] text-white font-medium"
                  >
                    Test /api/token-inspect
                  </Button>
                  <Button
                    className="w-full sm:w-auto bg-[#0D4884] hover:bg-[#0a3a6e] text-white font-medium"
                    onClick={() => pingApi('/auth-api/api/profile')}
                  >
                    Test /api/profile
                  </Button>
                </div>
                
                {testResult && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="flex items-center px-4 py-2 border-b border-slate-200 bg-white">
                      <Badge variant={testResult.status === 200 ? 'default' : 'destructive'} 
                             className={testResult.status === 200 ? 'bg-green-600 hover:bg-green-700' : ''}>
                        HTTP {testResult.status}
                      </Badge>
                      <span className="ml-3 font-mono text-sm text-slate-500">{testResult.api}</span>
                    </div>
                    <pre className="p-4 text-xs font-mono overflow-auto max-h-[300px] text-slate-700">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm flex flex-col gap-0 py-0">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" style={{color: '#0D4884'}} /> Token Claims
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-auto flex-1">
                <pre className="p-6 text-sm font-mono text-slate-700">
                  {JSON.stringify(tokenInfo.decoded, null, 2)}
                </pre>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 shadow-sm flex flex-col gap-0 py-0">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-rose-500" /> Platform JWT
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">RS256</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 relative flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none h-full w-full z-10" />
                <div className="break-all font-mono text-xs text-slate-400 overflow-hidden relative">
                  {tokenInfo.raw}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
