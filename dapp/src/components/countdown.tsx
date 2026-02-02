'use client';

import {useCountdown} from '~/hooks/utils/use-countdown';
import {cn} from '~/lib/utils';

export const CountdownUnit = ({
  value,
  label,
}: {
  value: number;
  label: string;
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 border border-border flex items-center justify-center">
        <span className="text-xl sm:text-2xl tabular-nums text-green">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] text-dim mt-2">{label}</span>
    </div>
  );
};

export const CountdownDisplay = ({timestamp}: {timestamp: number}) => {
  const countdown = useCountdown(timestamp);

  return (
    <div className="flex items-center justify-center gap-2">
      <CountdownUnit value={countdown.days} label="days" />
      <span className="text-dim text-xl mb-6">:</span>
      <CountdownUnit value={countdown.hours} label="hours" />
      <span className="text-dim text-xl mb-6">:</span>
      <CountdownUnit value={countdown.minutes} label="mins" />
      <span className="text-dim text-xl mb-6">:</span>
      <CountdownUnit value={countdown.seconds} label="secs" />
    </div>
  );
};

export function CountdownCompact({
  timestamp,
  className,
}: {
  timestamp: number;
  className?: string;
}) {
  const countdown = useCountdown(timestamp);

  const format = (n: number) => n.toString().padStart(2, '0');

  return (
    <span className={cn('tabular-nums', className)}>
      {countdown.days > 0 && (
        <>
          <span className="text-green">{countdown.days}</span>
          <span className="text-dim">d </span>
        </>
      )}
      <span className="text-green">{format(countdown.hours)}</span>
      <span className="text-dim">:</span>
      <span className="text-green">{format(countdown.minutes)}</span>
      <span className="text-dim">:</span>
      <span className="text-green">{format(countdown.seconds)}</span>
    </span>
  );
}
