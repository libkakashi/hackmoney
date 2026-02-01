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

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  showPrefix = false,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    showPrefix?: boolean;
  }) {
  // Don't add prefix for icon-only buttons
  const isIconOnly = size?.toString().startsWith('icon');
  const shouldShowPrefix = showPrefix && !isIconOnly;

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

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({variant, size, className}))}
      {...props}
    >
      {shouldShowPrefix && <span className="text-primary">$</span>}
      {children}
    </button>
  );
}

export {Button, buttonVariants};
