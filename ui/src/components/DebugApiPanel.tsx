import { ChartBarIcon as Activity } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AUTH_API, IS_PROD, TEMPLATE_API, USER_API } from '@/shared/platform/apiBases';
import type { JwtTokenData } from '@/shared/core/appTypes';
import { cn } from '@/shared/core/utils';

export interface DebugTestResult {
  api: string;
  data: unknown;
  status: number;
}

export interface DebugApiPanelProps {
  tokenInfo: { raw: string; decoded: JwtTokenData } | null;
  testResult: DebugTestResult | null;
  onRunTest: (label: string, url: string) => void;
  isCorporate: boolean;
}

export default function DebugApiPanel({
  tokenInfo,
  testResult,
  onRunTest,
  isCorporate,
}: DebugApiPanelProps) {
  return (
    <Card
      className={cn(
        'gap-0 py-0',
        isCorporate && 'border border-slate-300 bg-white text-slate-900 shadow-sm',
      )}
      style={
        isCorporate
          ? undefined
          : {
              background: 'rgba(5,5,15,0.7)',
              border: '1px solid rgba(34,211,238,0.18)',
              boxShadow: '0 0 40px rgba(34,211,238,0.05)',
            }
      }
    >
      <CardHeader
        className={cn('py-4', isCorporate && 'border-b border-slate-200 bg-slate-50')}
        style={
          isCorporate
            ? undefined
            : {
                borderBottom: '1px solid rgba(34,211,238,0.12)',
                background: 'rgba(34,211,238,0.03)',
              }
        }
      >
        <CardTitle
          className={cn(
            'text-lg flex items-center gap-2',
            isCorporate ? 'text-slate-800' : undefined,
          )}
          style={isCorporate ? undefined : { color: '#22d3ee' }}
        >
          <Activity
            className="h-5 w-5"
            style={isCorporate ? undefined : { color: '#22d3ee' }}
          />
          Debug API Endpoints
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div
          className={cn('mb-6 rounded-lg p-4', isCorporate && 'border border-slate-200 bg-slate-50')}
          style={
            isCorporate
              ? undefined
              : {
                  border: '1px solid rgba(34,211,238,0.15)',
                  background: 'rgba(34,211,238,0.04)',
                }
          }
        >
          <p
            className={cn('text-sm font-medium', isCorporate ? 'text-slate-700' : undefined)}
            style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.8)' }}
          >
            Use these buttons to verify your session, JWT, and role handling via the auth API.
          </p>
        </div>
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Button
            onClick={() =>
              onRunTest(
                'User registry',
                `${USER_API}/api/v1/users/${tokenInfo?.decoded?.sub ?? ''}`,
              )
            }
            variant="outline"
            size="lg"
            className={cn(
              'w-full',
              isCorporate
                ? 'border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                : 'text-cyan-300 hover:text-white',
            )}
            style={
              isCorporate
                ? undefined
                : { borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }
            }
          >
            User registry
          </Button>
          {!IS_PROD && (
            <Button
              onClick={() => onRunTest('Token Inspect', `${AUTH_API}/api/token-inspect`)}
              variant="outline"
              size="lg"
              className={cn(
                'w-full',
                isCorporate
                  ? 'border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                  : 'text-cyan-300 hover:text-white',
              )}
              style={
                isCorporate
                  ? undefined
                  : { borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }
              }
            >
              Token Inspect
            </Button>
          )}
          <Button
            onClick={() => onRunTest('Documents /d1', `${TEMPLATE_API}/api/v1/documents/d1`)}
            variant="outline"
            size="lg"
            className={cn(
              'w-full',
              isCorporate
                ? 'border-slate-300 text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                : 'text-cyan-300 hover:text-white',
            )}
            style={
              isCorporate
                ? undefined
                : { borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }
            }
          >
            Documents /d1
          </Button>
        </div>
        {testResult && (
          <div
            className={cn('rounded-lg overflow-hidden', isCorporate && 'border border-slate-200')}
            style={isCorporate ? undefined : { border: '1px solid rgba(34,211,238,0.18)' }}
          >
            <div
              className={cn(
                'flex items-center px-4 py-2',
                isCorporate && 'border-b border-slate-200 bg-slate-50',
              )}
              style={
                isCorporate
                  ? undefined
                  : {
                      borderBottom: '1px solid rgba(34,211,238,0.12)',
                      background: 'rgba(34,211,238,0.05)',
                    }
              }
            >
              <Badge
                variant={testResult.status === 200 ? 'default' : 'destructive'}
                className={testResult.status === 200 ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                HTTP {testResult.status}
              </Badge>
              <span
                className={cn('ml-3 font-mono text-sm', isCorporate ? 'text-slate-600' : undefined)}
                style={isCorporate ? undefined : { color: 'rgba(34,211,238,0.6)' }}
              >
                {testResult.api}
              </span>
            </div>
            <pre
              className={cn(
                'p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all',
                isCorporate ? 'bg-slate-50 text-slate-800' : 'text-slate-300',
              )}
              style={isCorporate ? undefined : { background: 'rgba(5,5,15,0.8)' }}
            >
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
