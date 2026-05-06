import { useState, useEffect } from 'react';
import { setupTracing } from './otel';
import { jwtDecode } from 'jwt-decode';
import { User, Shield, Activity, Fingerprint, Lock } from 'lucide-react';

// Setup OpenTelemetry right away
setupTracing();

interface LocalOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

export default function App() {
  const [tokenInfo, setTokenInfo] = useState<{ raw: string, decoded: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{api: string, data: any, status: number} | null>(null);
  const [activeRole, setActiveRole] = useState<string>('');

  const fetchTokens = async () => {
    try {
      const res = await fetch('/auth-api/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=session'
      });
      if (!res.ok) {
        const text = await res.text();
        setError(`Failed to fetch token: ${res.status} HTTP. ${text}`);
      } else {
        const data: LocalOauthToken = await res.json();
        if (data.access_token) {
          const decoded: any = jwtDecode(data.access_token);
          setTokenInfo({ raw: data.access_token, decoded });
          
          // Seed the active role
          const roles = decoded?.['neosofia:roles'] || [];
          if (roles.length > 0) {
            setActiveRole(roles[0]);
          }
          
          setError(null);
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const testAuthAPI = async () => {
    if (!tokenInfo) return;
    try {
      const res = await fetch('/auth-api/api/me', { 
        headers: { 
          'Authorization': `Bearer ${tokenInfo.raw}`,
          ...(activeRole ? { 'X-Active-Role': activeRole } : {})
        } 
      });
      const data = await res.json();
      setTestResult({ api: 'Auth /api/me', data, status: res.status });
    } catch(e: any) { setTestResult({ api: 'Auth /api/me', data: e.message, status: 500 }); }
  };

  const testTemplateAPI = async () => {
    if (!tokenInfo) return;
    try {
      const res = await fetch('/template-api/api/v1/documents/d1', { 
        headers: { 
          'Authorization': `Bearer ${tokenInfo.raw}`,
          ...(activeRole ? { 'X-Active-Role': activeRole } : {})
        } 
      });
      const data = await res.json();
      setTestResult({ api: 'Template /api/v1/documents', data, status: res.status });
    } catch(e: any) { setTestResult({ api: 'Template /api/v1/documents', data: e.message, status: 500 }); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="text-indigo-600 h-8 w-8" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">CDP UI Integration Test</h1>
          </div>
          {!tokenInfo && (
            <a href="http://localhost:8014/login" className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center shadow-sm">
              <Lock className="h-4 w-4 mr-2" /> Login
            </a>
          )}
        </header>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start">
            <Shield className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Not Authenticated</h3>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-xs opacity-75 mt-2">Make sure you have logged in securely via WorkOS. After login on port 8014, return here or refresh.</p>
            </div>
          </div>
        )}

        {tokenInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              
              {/* Role Picker (conditionally rendered) */}
              {(tokenInfo.decoded?.['neosofia:roles']?.length || 0) > 1 && (
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
                    <User className="h-5 w-5 mr-2 text-indigo-500" /> Active Role Selector
                  </h2>
                  <p className="text-sm text-slate-600 mb-4">
                    You have multiple roles authorized. Select your active role to assume for the current session.
                  </p>
                  <select 
                    value={activeRole} 
                    onChange={(e) => setActiveRole(e.target.value)}
                    className="w-full md:w-1/2 p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800"
                  >
                    {tokenInfo.decoded['neosofia:roles'].map((role: string) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </section>
              )}

              <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-semibold mb-4 flex items-center text-slate-800">
                  <Fingerprint className="h-5 w-5 mr-2 text-indigo-500" /> Your JWT Payload
                </h2>
                <div className="bg-slate-950 text-indigo-200 p-4 rounded-lg overflow-x-auto text-sm border-t-4 border-indigo-500 shadow-inner">
                  <pre><code>{JSON.stringify(tokenInfo.decoded, null, 2)}</code></pre>
                </div>
              </section>
              {testResult && (
                <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-lg font-semibold mb-4">Test Result: {testResult.api}</h2>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded uppercase ${testResult.status < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {testResult.status} API
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 overflow-x-auto text-sm text-slate-600 font-mono">
                    <pre><code>{JSON.stringify(testResult.data, null, 2)}</code></pre>
                  </div>
                </section>
              )}
            </div>
            <div className="space-y-4">
              <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-base font-semibold mb-4 text-slate-800 border-b pb-2">Actions</h2>
                <div className="space-y-3">
                  <button onClick={testAuthAPI} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg transition font-medium text-sm flex items-center">
                    <User className="h-4 w-4 mr-2 opacity-70" /> Test Auth /api/me
                  </button>
                  <button onClick={testTemplateAPI} className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg transition font-medium text-sm flex items-center">
                    <Activity className="h-4 w-4 mr-2 opacity-70" /> Test Template API
                  </button>
                  <form method="POST" action="http://localhost:8014/logout">
                    <button type="submit" className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 hover:border-red-300 text-red-600 rounded-lg transition font-medium text-sm flex items-center">
                      <Lock className="h-4 w-4 mr-2 opacity-70" /> Log Out
                    </button>
                  </form>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
