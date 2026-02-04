'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {usePathname} from 'next/navigation';
import {useTokenByAddress} from '~/hooks/use-tokens';

interface AgentContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export const AgentProvider = ({children}: {children: ReactNode}) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(prev => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <AgentContext.Provider value={{open, toggle, close}}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
};

export interface PageContext {
  page: 'token' | 'discover' | 'other';
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
}

export const usePageContext = (): PageContext => {
  const pathname = usePathname();

  const tokenMatch = pathname.match(/^\/token\/(0x[a-fA-F0-9]{40})$/);
  const tokenAddress = tokenMatch?.[1];

  const {data: token} = useTokenByAddress(tokenAddress);

  return useMemo(() => {
    if (tokenAddress) {
      return {
        page: 'token' as const,
        tokenAddress,
        tokenSymbol: token?.symbol,
        tokenName: token?.name,
      };
    }
    if (pathname === '/discover' || pathname === '/') {
      return {page: 'discover' as const};
    }
    return {page: 'other' as const};
  }, [pathname, tokenAddress, token?.symbol, token?.name]);
};
