import React from 'react';
import { Star, Zap, Wifi, Gift, Percent, Flame, Rocket, Sparkles, LucideIcon } from 'lucide-react';

export const PROMO_ICON_MAP: Record<string, LucideIcon> = {
  star: Star,
  zap: Zap,
  wifi: Wifi,
  gift: Gift,
  percent: Percent,
  flame: Flame,
  rocket: Rocket,
  sparkles: Sparkles,
};

export const PROMO_ICON_OPTIONS = Object.keys(PROMO_ICON_MAP);

export const PROMO_COLOR_OPTIONS = ['iris', 'gold', 'brand', 'success', 'danger', 'grape'];

export const PROMO_BG: Record<string, string> = {
  iris: 'bg-iris',
  gold: 'bg-gold',
  brand: 'bg-brand',
  success: 'bg-success',
  danger: 'bg-danger',
  grape: 'bg-grape',
};

export function PromoIcon({ name, className }: { name: string; className?: string }) {
  const Icon = PROMO_ICON_MAP[name] || Star;
  return <Icon className={className} />;
}
