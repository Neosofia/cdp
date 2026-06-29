export function rolesOutsideNamespace(roles: string[], namespacePrefix: string): string[] {
  const prefix = `${namespacePrefix}.`;
  return roles.filter((role) => !role.startsWith(prefix));
}

export function rolesInNamespace(roles: string[], namespacePrefix: string): string[] {
  const prefix = `${namespacePrefix}.`;
  return roles.filter((role) => role.startsWith(prefix));
}
