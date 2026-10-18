import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: 'none' | 'primary' | 'pink' | 'cyan' | 'danger';
  variant?: 'surface' | 'light' | 'elevated';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  variant = 'surface',
  ...props
}) => {
  const bgStyles = {
    surface: 'glass-surface',
    light: 'glass-light',
    elevated: 'glass-elevated',
  }[variant];

  const borderStyles = {
    none: 'border-white/[0.08]',
    primary: 'border-[#8B5CF6]/40',
    pink: 'border-[#EC4899]/40',
    cyan: 'border-[#06B6D4]/40',
    danger: 'border-[#F43F5E]',
  }[glow];

  return (
    <div
      style={{
        backdropFilter: variant === 'elevated' ? 'blur(28px) saturate(190%)' : 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: variant === 'elevated' ? 'blur(28px) saturate(190%)' : 'blur(20px) saturate(180%)',
        ...props.style,
      }}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${bgStyles} ${borderStyles} ${className}`}
      {...props}
    >
      {/* Top Subtle Highlight Reflection Line matching mobapp glassHighlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
