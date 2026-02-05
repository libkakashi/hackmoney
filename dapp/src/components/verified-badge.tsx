import {BadgeCheck} from 'lucide-react';
import {cn} from '~/lib/utils';

interface VerifiedBadgeProps {
  ensName: string;
  showName?: boolean;
  className?: string;
  iconClassName?: string;
}

export const VerifiedBadge = ({
  ensName,
  showName = false,
  className,
  iconClassName,
}: VerifiedBadgeProps) => {
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-cyan-500', className)}
      title={`${ensName}.eth`}
    >
      <BadgeCheck className={cn('h-4 w-4 shrink-0', iconClassName)} />
      {showName && <span className="text-sm">{ensName}.eth</span>}
    </span>
  );
};
