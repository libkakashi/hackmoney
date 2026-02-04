import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '~/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-green",
  {
    variants: {
      variant: {
        default:
          'border border-green text-green hover:bg-green hover:text-background',
        destructive:
          'border border-red text-red hover:bg-red hover:text-background',
        outline: 'border border-border hover:border-dim',
        secondary: 'border border-border text-foreground hover:border-dim',
        ghost: 'hover:bg-card',
        link: 'text-purple underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        xs: 'h-6 gap-1 px-2 text-xs',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
        'icon-xs': 'h-6 w-6 text-xs',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789';

function useTextScramble(text: string) {
  const [displayText, setDisplayText] = React.useState(text);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setDisplayText(text);
  }, [text]);

  const scramble = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    let iteration = 0;
    const totalIterations = 5;
    const intervalTime = 300 / totalIterations;

    intervalRef.current = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            // Progressively reveal characters from left to right
            if (index < iteration) return text[index];
            return SCRAMBLE_CHARS[
              Math.floor(Math.random() * SCRAMBLE_CHARS.length)
            ];
          })
          .join(''),
      );

      iteration += text.length / totalIterations;

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayText(text);
      }
    }, intervalTime);
  }, [text]);

  const reset = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDisplayText(text);
  }, [text]);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {displayText, scramble, reset};
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (React.isValidElement(children) && children.props.children) {
    return extractTextFromChildren(children.props.children);
  }
  return '';
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  showPrefix = false,
  children,
  onMouseEnter,
  onMouseLeave,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    showPrefix?: boolean;
  }) {
  // Don't add prefix for icon-only buttons
  const isIconOnly = size?.toString().startsWith('icon');
  const shouldShowPrefix = showPrefix && !isIconOnly;

  const text = extractTextFromChildren(children);
  const hasTextContent = text.length > 0 && !isIconOnly;
  const {displayText, scramble, reset} = useTextScramble(text);

  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hasTextContent) scramble();
      onMouseEnter?.(e);
    },
    [hasTextContent, scramble, onMouseEnter],
  );

  const handleMouseLeave = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hasTextContent) reset();
      onMouseLeave?.(e);
    },
    [hasTextContent, reset, onMouseLeave],
  );

  if (asChild) {
    return (
      <Slot
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={cn(buttonVariants({variant, size, className}))}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  // Determine what to render - scrambled text or original children
  const renderContent = () => {
    if (!hasTextContent) {
      return children;
    }
    // If children is just a string, render the scrambled text
    if (typeof children === 'string') {
      return displayText;
    }
    // For complex children (with icons etc), try to replace text portions
    return React.Children.map(children, child => {
      if (typeof child === 'string') {
        // Find the position of this text in the overall text and get corresponding scrambled portion
        const startIndex = text.indexOf(child);
        if (startIndex !== -1) {
          return displayText.slice(startIndex, startIndex + child.length);
        }
        return child;
      }
      return child;
    });
  };

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({variant, size, className}))}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {shouldShowPrefix && <span className="text-primary">$</span>}
      {renderContent()}
    </button>
  );
}

export {Button, buttonVariants};
