import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ children, variant = 'primary', className, ...rest }: ButtonProps) => {
  const baseStyles =
    'rounded-full px-4 py-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-300';
  const variantStyles =
    variant === 'primary'
      ? 'bg-[linear-gradient(135deg,#2dd4bf_0%,#fbbf24_100%)] text-slate-950 hover:brightness-105'
      : 'bg-white/10 text-white hover:bg-white/20';
  return (
    <button className={cn(baseStyles, variantStyles, className)} {...rest}>
      {children}
    </button>
  );
};
