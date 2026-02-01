import * as React from 'react';

import {cn} from '~/lib/utils';

function Input({className, type, ...props}: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 border border-border bg-background px-3 py-1 text-sm outline-none placeholder:text-dim disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-red',
        className,
      )}
      {...props}
    />
  );
}

export {Input};
