'use client';

import type {ReactNode} from 'react';
import {AgentSidebar} from './agent-sidebar';

export function AgentLayout({children}: {children: ReactNode}) {
  return (
    <div className="flex flex-1 min-h-0">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <AgentSidebar />
    </div>
  );
}
