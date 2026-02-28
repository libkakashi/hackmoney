'use client';

import {useState, useMemo} from 'react';
import {maxUint128, parseUnits, formatUnits, type Address} from 'viem';
import {useConnection} from 'wagmi';
import {ChevronDown, Settings, ShoppingCart, Tag} from 'lucide-react';
import {toast} from 'sonner';

import {useQueryClient} from '@tanstack/react-query';
import {Input} from '~/components/ui/input';
import {Button} from '~/components/ui/button';
import {Loader} from '~/components/ui/loader';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '~/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '~/components/ui/popover';
import {cn, PoolKey} from '~/lib/utils';
import {useSwap} from '~/hooks/swap/use-swap';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {useTokenBalance} from '~/hooks/tokens/use-token-balance';
import {useMultiHopQuote} from '~/hooks/swap/use-quote';
import {QUOTE_TOKENS, type QuoteToken, isDirectSwap} from '~/lib/pools';

type Side = 'buy' | 'sell';

interface SwapCardProps {
  poolKey?: PoolKey | null;
  tokenAddr?: Address;
}

export const SwapCard = ({poolKey, tokenAddr}: SwapCardProps) => {
  const queryClient = useQueryClient();
  const {address, isConnected} = useConnection();

  const {data: {symbol: tokenSymbol, decimals: tokenDecimals} = {}} =
    useTokenData(tokenAddr);

  const [selectedQuoteToken, setSelectedQuoteToken] = useState<QuoteToken>(
    QUOTE_TOKENS[0],
  );
  const [side, setSide] = useState<Side>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('1');
  const [deadline, setDeadline] = useState('20');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const quoteSymbol = selectedQuoteToken.symbol;
  const quoteDecimals = selectedQuoteToken.decimals;

  const {
    swapExactInSingle,
    swapExactIn,
    isPending: isSwapPending,
  } = useSwap();

  // Both sides use exact input quoting for reliability:
  // buy: user enters quote token amount to spend, quote returns token amount received
  // sell: user enters launchpad token amount to sell, quote returns quote token received
  const sellingToken = side === 'sell';

  // buy: input is quote token (USDC), output is launchpad token
  // sell: input is launchpad token, output is quote token
  const inputSymbol = sellingToken ? tokenSymbol : quoteSymbol;
  const inputDecimals = sellingToken ? tokenDecimals : quoteDecimals;
  const outputSymbol = sellingToken ? quoteSymbol : tokenSymbol;
  const outputDecimals = sellingToken ? quoteDecimals : tokenDecimals;

  const {data: tokenBalance} = useTokenBalance(tokenAddr, address);
  const {data: quoteBalance} = useTokenBalance(selectedQuoteToken.address, address);

  const parsedAmount = useMemo(() => {
    if (!amount || !inputDecimals) return undefined;
    try {
      return parseUnits(amount, inputDecimals);
    } catch {
      return undefined;
    }
  }, [amount, inputDecimals]);

  const quoteEnabled = parsedAmount !== undefined && parsedAmount > 0n;

  const {
    data: quoteData,
    fetchStatus,
    error: quoteError,
  } = useMultiHopQuote(poolKey ?? undefined, {
    quoteToken: selectedQuoteToken,
    tokenAddr,
    exactAmount: parsedAmount,
    sellingToken,
    exactInput: true,
    enabled: quoteEnabled,
  });

  const quotedAmount = quoteData?.quotedAmount;
  const isQuoteLoading = fetchStatus === 'fetching';

  // quotedAmount = how much output token user receives (always exact input)
  const estimatedOutput = useMemo(() => {
    if (!quotedAmount || !outputDecimals) return undefined;
    return formatUnits(quotedAmount, outputDecimals);
  }, [quotedAmount, outputDecimals]);

  // min output with slippage protection
  const amountOutMin = useMemo(() => {
    if (!quotedAmount || !slippage) return 0n;
    const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100));
    return quotedAmount - (quotedAmount * slippageBps) / 10000n;
  }, [quotedAmount, slippage]);

  const exchangeRate = useMemo(() => {
    if (!quotedAmount || !parsedAmount || !inputDecimals || !outputDecimals) return null;
    const inNum = Number(formatUnits(parsedAmount, inputDecimals));
    const outNum = Number(formatUnits(quotedAmount, outputDecimals));
    if (!inNum || !outNum) return null;
    return (outNum / inNum).toFixed(6);
  }, [quotedAmount, parsedAmount, inputDecimals, outputDecimals]);

  const handleSwap = async () => {
    if (!address) {
      toast.error('Wallet not connected');
      return;
    }
    if (!poolKey || !tokenAddr || !parsedAmount) {
      toast.error('Missing parameters');
      return;
    }
    if (parsedAmount > maxUint128 || amountOutMin > maxUint128) {
      toast.error('Amount exceeds uint128 max');
      return;
    }

    const swapDeadline = BigInt(
      Math.floor(Date.now() / 1000) + parseInt(deadline) * 60,
    );
    const isDirect = isDirectSwap(selectedQuoteToken);
    const tokenIsCurrency0 =
      poolKey.currency0.toLowerCase() === tokenAddr.toLowerCase();

    // Both sides are exact input swaps
    // sell: selling token (zeroForOne = tokenIsCurrency0)
    // buy: selling quote token (zeroForOne = !tokenIsCurrency0)
    const zeroForOne = sellingToken ? tokenIsCurrency0 : !tokenIsCurrency0;

    try {
      let receipt;

      if (isDirect) {
        receipt = await swapExactInSingle(
          poolKey, parsedAmount, amountOutMin, zeroForOne, swapDeadline,
        );
      } else {
        receipt = await swapExactIn(
          poolKey, selectedQuoteToken, tokenAddr,
          parsedAmount, amountOutMin, sellingToken, swapDeadline,
        );
      }

      if (receipt.status === 'success') {
        toast.success('Swap completed!', {
          description: `Confirmed in block ${receipt.blockNumber}`,
        });
        setAmount('');
      } else {
        toast.error('Swap reverted');
      }
    } catch (err: unknown) {
      const error = err as Error & {shortMessage?: string};
      toast.error('Swap failed', {
        description: error.shortMessage || error.message,
      });
      console.error(err);
    } finally {
      void queryClient.invalidateQueries();
    }
  };

  const handleMaxAmount = () => {
    if (side === 'sell' && tokenBalance && tokenDecimals) {
      setAmount(formatUnits(tokenBalance, tokenDecimals));
    } else if (side === 'buy' && quoteBalance && quoteDecimals) {
      setAmount(formatUnits(quoteBalance, quoteDecimals));
    }
  };

  const handleSelectQuoteToken = (qt: QuoteToken) => {
    setSelectedQuoteToken(qt);
    setAmount('');
  };

  const handleSwitchSide = (newSide: Side) => {
    setSide(newSide);
    setAmount('');
  };

  const hasValidAmount = amount && parseFloat(amount) > 0;

  const canSwap =
    isConnected &&
    hasValidAmount &&
    !isSwapPending &&
    !isQuoteLoading &&
    !quoteError &&
    !!quotedAmount &&
    !!poolKey;

  return (
    <div className="flex flex-col justify-between space-y-3">
      {/* Buy / Sell Tabs + Settings */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={() => handleSwitchSide('buy')}
            className={cn(
              side === 'buy' ? 'text-green' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ShoppingCart className="size-3" />
            buy
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleSwitchSide('sell')}
            className={cn(
              side === 'sell' ? 'text-green' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Tag className="size-3" />
            sell
          </Button>
        </div>
        <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 space-y-3 p-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">slippage (%)</label>
              <Input
                type="number"
                step="0.1"
                value={slippage}
                onChange={e => setSlippage(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">deadline (min)</label>
              <Input
                type="number"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Amount input */}
      <div className="border border-border bg-background px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {side === 'buy' ? 'you pay' : 'you sell'}
          </span>
          {((side === 'sell' && tokenBalance && tokenDecimals) ||
            (side === 'buy' && quoteBalance && quoteDecimals)) && (
            <button
              type="button"
              onClick={handleMaxAmount}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              bal:{' '}
              <span className="text-purple tabular-nums">
                {side === 'sell'
                  ? formatUnits(tokenBalance!, tokenDecimals!)
                  : formatUnits(quoteBalance!, quoteDecimals)}
              </span>
              <span className="ml-1 text-green">[MAX]</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 bg-transparent text-base tabular-nums outline-none placeholder:text-dim w-0 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-green text-xs shrink-0">
            {inputSymbol || '---'}
          </span>
        </div>
      </div>

      {/* Estimated output */}
      <div className="flex items-center justify-end gap-2 px-1">
        {isQuoteLoading && hasValidAmount ? (
          <Loader type="dots" className="text-green" />
        ) : quoteError && hasValidAmount ? (
          <span className="text-xs text-red">// quote error</span>
        ) : (
          <span className="text-sm tabular-nums text-muted-foreground">
            {estimatedOutput
              ? `≈ ${Number(estimatedOutput).toFixed(4)} ${outputSymbol ?? ''}`
              : '—'}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-green text-sm hover:text-foreground transition-colors outline-none"
            >
              {selectedQuoteToken.symbol}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px]">
            {QUOTE_TOKENS.map(qt => (
              <DropdownMenuItem
                key={qt.symbol}
                onClick={() => handleSelectQuoteToken(qt)}
                className={cn(
                  'flex items-center justify-between gap-3',
                  qt.symbol === selectedQuoteToken.symbol && 'text-green',
                )}
              >
                <span>{qt.symbol}</span>
                {qt.intermediatePool && (
                  <span className="text-[10px] text-dim">2-hop</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quote Info */}
      {(quoteError || exchangeRate) && (
        <div className="py-1 text-center">
          {quoteError ? (
            <p className="text-xs text-red">// error: failed to fetch quote</p>
          ) : exchangeRate ? (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="tabular-nums">
                <span className="text-purple">1</span> {inputSymbol}{' '}
                <span className="text-muted-foreground">=</span>{' '}
                <span className="text-green">{exchangeRate}</span> {outputSymbol}
              </div>
              {amountOutMin > 0n && outputDecimals && (
                <div className="text-muted-foreground">
                  min:{' '}
                  <span className="text-purple tabular-nums">
                    {Number(formatUnits(amountOutMin, outputDecimals)).toFixed(4)}
                  </span>{' '}
                  {outputSymbol}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Swap Button */}
      <Button className="w-full h-10" onClick={handleSwap} disabled={!canSwap}>
        {isSwapPending ? (
          <>
            <Loader type="dots" className="mr-2" />
            {side === 'buy' ? 'buying...' : 'selling...'}
          </>
        ) : !isConnected ? (
          '// connect wallet'
        ) : !hasValidAmount ? (
          '// enter amount'
        ) : isQuoteLoading ? (
          <>
            <Loader type="dots" className="mr-2" />
            fetching quote...
          </>
        ) : (
          `$ ${side}`
        )}
      </Button>
    </div>
  );
};
