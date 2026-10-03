export function loginDestination(role: string | undefined, search: string): string {
  if (role !== 'user') return '/admin';
  const next = new URLSearchParams(search).get('next') || '';
  const match = /^\/user\/buy\?packageId=([1-9]\d*)$/.exec(next);
  return match && Number.isSafeInteger(Number(match[1])) ? next : '/user';
}