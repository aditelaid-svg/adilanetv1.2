import type { Package } from '../AppContext';

export function isSellablePackage(pkg: Package): boolean {
  const price = Number(pkg.price);
  const routerId = Number(pkg.router_id);
  return Number.isFinite(price) && price > 0 &&
    Number.isInteger(routerId) && routerId > 0 &&
    typeof pkg.mikrotik_profile === 'string' && pkg.mikrotik_profile.trim().length > 0;
}