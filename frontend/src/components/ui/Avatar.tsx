import { cn, initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}

const sizes: Record<string, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

export function Avatar({ name, color = '#6366F1', size = 'md', online, className }: AvatarProps) {
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn('flex items-center justify-center rounded-full font-semibold text-white', sizes[size])}
        style={{ backgroundColor: color }}
        title={name}
      >
        {initials(name)}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-paper-raised',
            size === 'lg' ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5',
            online ? 'bg-teal' : 'bg-ink-soft/40'
          )}
        />
      )}
    </div>
  );
}
