import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '~/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center border px-2 py-0.5 text-xs w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors',
  {
    variants: {
      variant: {
        default: 'border-green text-green',
        secondary: 'border-border text-foreground',
        destructive: 'border-red text-red',
        outline: 'border-border text-foreground',
        ghost: 'border-transparent',
        link: 'border-transparent text-purple underline-offset-4 hover:underline',
        success: 'border-green text-green',
        warning: 'border-yellow text-yellow',
        purple: 'border-purple text-purple',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {asChild?: boolean}) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({variant}), className)}
      {...props}
    />
  );
}

export {Badge, badgeVariants};
