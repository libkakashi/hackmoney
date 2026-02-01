import * as React from 'react';

import {cn} from '~/lib/utils';

function Textarea({className, ...props}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-16 w-full border border-border bg-background px-3 py-2 text-sm placeholder:text-dim outline-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-red',
        className,
      )}
      {...props}
    />
  );
}

export {Textarea};
