import { Fragment, type ReactNode } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { AppBreadcrumbCrumb } from '@/shared/app/appBreadcrumbModel';

export interface AppShellBreadcrumbProps {
  crumbs: AppBreadcrumbCrumb[];
  linkClassName: string;
  trailing?: ReactNode;
}

export default function AppShellBreadcrumb({
  crumbs,
  linkClassName,
  trailing,
}: AppShellBreadcrumbProps) {
  return (
    <>
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.key}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {crumb.onNavigate ? (
                  <BreadcrumbLink
                    href={crumb.href}
                    onClick={(event) => {
                      event.preventDefault();
                      crumb.onNavigate?.();
                    }}
                    className={linkClassName}
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className={crumb.pageClassName}>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </>
  );
}
