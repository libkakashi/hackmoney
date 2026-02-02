'use client';

import {Card, CardContent} from '~/components/ui/card';
import {Skeleton} from '~/components/ui/skeleton';

export function LoadingPanel() {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}
