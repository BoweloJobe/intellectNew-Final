import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = false }: GlassCardProps) {
  return (
    <div 
      className={`rounded-2xl backdrop-blur-xl border p-6 ${
        hover ? 'transition-[transform,box-shadow] duration-200 ease-out hover:shadow-2xl hover:-translate-y-[2px] motion-reduce:transition-none motion-reduce:hover:translate-y-0' : ''
      } ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        borderColor: 'rgba(255, 255, 255, 0.7)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}
    >
      {children}
    </div>
  );
}
