import React from 'react';
import { Loader2 } from 'lucide-react';

export interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-lg',
    md: 'px-5 py-2.5 text-sm font-semibold gap-2 rounded-xl',
    lg: 'px-7 py-3.5 text-base font-bold gap-2.5 rounded-2xl',
  }[size];

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white font-bold hover:brightness-105 active:scale-[0.98]',
    secondary:
      'bg-[#06B6D4] text-white font-bold hover:brightness-105 active:scale-[0.98]',
    accent:
      'bg-[#F59E0B] text-white font-bold hover:brightness-105 active:scale-[0.98]',
    outline:
      'border border-white/15 hover:border-white/30 text-[#F8FAFC] bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98]',
    danger:
      'bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold shadow-md shadow-[#F43F5E]/20 active:scale-[0.98]',
    ghost:
      'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] active:scale-[0.98]',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
