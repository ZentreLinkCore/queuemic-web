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
    surface: 'bg-[#151724]',
    light: 'bg-[#1C1F30]',
    elevated: 'bg-[#242738]',
  }[variant];

  const borderStyles = {
    none: 'border-white/[0.08]',
    primary: 'border-[#8B5CF6]/40',
    pink: 'border-[#EC4899]/40',
    cyan: 'border-[#06B6D4]/40',
    danger: 'border-[#F43F5E] shadow-[0_4px_20px_rgba(244,63,94,0.18)]',
  }[glow];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${bgStyles} ${borderStyles} ${className}`}
      {...props}
    >
      {/* Top Subtle Highlight Reflection Line matching mobapp glassHighlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-white/[0.06] pointer-events-none" />
      {children}
    </div>
  );
};
