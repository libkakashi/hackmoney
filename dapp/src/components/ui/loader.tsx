'use client';

import * as React from 'react';
import {useEffect} from 'react';
import {cn} from '~/lib/utils';

type LoaderType = 'dots' | 'arc' | 'bounce' | 'pulse';

const FRAMES: Record<LoaderType, string[]> = {
  // Braille dots - smooth and modern (yarn/pnpm style)
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  // Arc spinner - clean minimal
  arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
  // Bouncing ball
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  // Pulsing dot
  pulse: ['∙', '●', '∙', ' '],
  // Rotating arrows
};

interface LoaderProps {
  type?: LoaderType;
  interval?: number;
  className?: string;
}

function Loader({type = 'dots', interval = 100, className}: LoaderProps) {
  const [frameIndex, setFrameIndex] = React.useState(0);
  const frames = FRAMES[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % frames.length);
    }, interval);

    return () => clearInterval(timer);
  }, [frames.length, interval]);

  return (
    <span className={cn('inline-block font-mono', className)}>
      {frames[frameIndex]}
    </span>
  );
}

export {Loader};
export type {LoaderType};
