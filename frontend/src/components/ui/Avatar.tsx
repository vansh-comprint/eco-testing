import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base',
};

const statusSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
};

const statusColors = {
  online: 'bg-emerald-400',
  offline: 'bg-slate-300 dark:bg-white/30',
  away: 'bg-amber-400',
  busy: 'bg-red-400',
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getColorFromName = (name: string): { bg: string; text: string } => {
  const colors = [
    { bg: 'bg-ecotribe-primary/[0.15]', text: 'text-ecotribe-primary' },
    { bg: 'bg-cyan-500/[0.15]', text: 'text-cyan-400' },
    { bg: 'bg-violet-500/[0.15]', text: 'text-violet-400' },
    { bg: 'bg-amber-500/[0.15]', text: 'text-amber-400' },
    { bg: 'bg-rose-500/[0.15]', text: 'text-rose-400' },
    { bg: 'bg-blue-500/[0.15]', text: 'text-blue-400' },
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className,
}) => {
  const colorScheme = getColorFromName(name);

  return (
    <div className={cn('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizes[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium',
            sizes[size],
            colorScheme.bg,
            colorScheme.text
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-[#0a0a0b]',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

// Avatar group for showing multiple users
interface AvatarGroupProps {
  users: { name: string; src?: string }[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 4,
  size = 'md',
  className,
}) => {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {visibleUsers.map((user, index) => (
        <Avatar
          key={index}
          name={user.name}
          src={user.src}
          size={size}
          className="ring-2 ring-white dark:ring-[#0a0a0b]"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-medium',
            'bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-white/50 ring-2 ring-white dark:ring-[#0a0a0b]',
            sizes[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default Avatar;
