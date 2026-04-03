import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, className, ...rest }: InputProps) => {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-2 block text-sm text-slate-300">{label}</span>
      )}
      <input
        className="field !min-h-[52px] bg-slate-950/70"
        {...rest}
      />
      {error && (
        <div className="mt-1 text-xs text-rose-200">{error}</div>
      )}
    </label>
  );
};
