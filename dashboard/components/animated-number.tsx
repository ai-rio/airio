'use client';

import { useCountUp } from '@/lib/use-count-up';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 600,
  suffix = '',
  className,
}: AnimatedNumberProps) {
  const current = useCountUp(value, duration);
  return (
    <span className={className}>
      {current}
      {suffix}
    </span>
  );
}
