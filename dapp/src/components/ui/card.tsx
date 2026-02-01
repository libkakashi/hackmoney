import * as React from 'react';

import {cn} from '~/lib/utils';

function Card({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('border border-border bg-card', className)}
      {...props}
    />
  );
}

function CardHeader({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('p-4 border-b border-border', className)}
      {...props}
    />
  );
}

function CardTitle({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-sm', className)}
      {...props}
    />
  );
}

function CardDescription({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-dim text-xs', className)}
      {...props}
    />
  );
}

function CardAction({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-action" className={cn('', className)} {...props} />
  );
}

function CardContent({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" className={cn('p-4', className)} {...props} />
  );
}

function CardFooter({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('p-4 border-t border-border', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
