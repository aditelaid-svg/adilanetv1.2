import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-14 px-6"
    >
      <div className="w-16 h-16 rounded-[20px] bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-white/40" />
      </div>
      <h3 className="text-white font-semibold text-[15px] tracking-tight">{title}</h3>
      {description && (
        <p className="text-white/40 text-[13px] font-medium mt-1.5 max-w-[260px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
