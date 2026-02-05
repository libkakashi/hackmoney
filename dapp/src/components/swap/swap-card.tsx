'use client';

import {useState, useMemo} from 'react';
import {maxUint128, parseUnits, formatUnits, type Address} from 'viem';
import {useConnection} from 'wagmi';
import {ArrowDownUp, ChevronDown} from 'lucide-react';
import {toast} from 'sonner';

import {useQueryClient} from '@tanstack/react-query';
import {Input} from '~/components/ui/input';
import {Button} from '~/components/ui/button';
import {Loader} from '~/components/ui/loader';
import {cn, PoolKey} from '~/lib/utils';
import {useSwap} from '~/hooks/swap/use-swap';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {useTokenBalance} from '~/hooks/tokens/use-token-balance';
import {useMultiHopQuote} from '~/hooks/swap/use-quote';
import {QUOTE_TOKENS, type QuoteToken, isDirectSwap} from '~/lib/pools';
import {TokenSelectorModal} from './token-selector-modal';

interface SwapCardProps {
  poolKey?: PoolKey | null;
  tokenAddr?: Address;
}

export const SwapCard = ({poolKey, tokenAddr}: SwapCardProps) => {
  const queryClient = useQueryClient();
  const {address, isConnected} = useConnection();

  // Launchpad token data
  const {data: {symbol: tokenSymbol, decimals: tokenDecimals} = {}} =
    useTokenData(tokenAddr);

  // Quote token selection
  const [selectedQuoteToken, setSelectedQuoteToken] = useState<QuoteToken>(
    QUOTE_TOKENS[0],
  );
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  const quoteSymbol = selectedQuoteToken.symbol;
  const quoteDecimals = selectedQuoteToken.decimals;

  const {
    swapExactInSingle,
    swapExactOutSingle,
    swapExactIn,
    swapExactOut,
    isPending: isSwapPending,
  } = useSwap();

  const [inputAmount, setInputAmount] = useState('');
  // sellingToken=true: sell side = launchpad token, buy side = quote token
  // sellingToken=false: sell side = quote token, buy side = launchpad token
  const [sellingToken, setSellingToken] = useState(true);
  const [isExactInput, setIsExactInput] = useState(true);
  const [slippage, setSlippage] = useState('1');
  const [deadline, setDeadline] = useState('20');
  const [showSettings, setShowSettings] = useState(false);
  const [outputAmount, setOutputAmount] = useState('');

  // Determine which side is sell vs buy
  const sellSymbol = sellingToken ? tokenSymbol : quoteSymbol;
  const sellDecimals = sellingToken ? tokenDecimals : quoteDecimals;
  const buySymbol = sellingToken ? quoteSymbol : tokenSymbol;
  const buyDecimals = sellingToken ? quoteDecimals : tokenDecimals;

  const sellTokenAddr = sellingToken ? tokenAddr : selectedQuoteToken.address;
  const buyTokenAddr = sellingToken ? selectedQuoteToken.address : tokenAddr;

  const {data: sellBalance} = useTokenBalance(sellTokenAddr, address);
  const {data: buyBalance} = useTokenBalance(buyTokenAddr, address);

  const amountIn = useMemo(() => {
    if (!inputAmount || !sellDecimals) return undefined;
    try {
      return parseUnits(inputAmount, sellDecimals);
    } catch {
      return undefined;
    }
  }, [inputAmount, sellDecimals]);

  const amountOut = useMemo(() => {
    if (!outputAmount || !buyDecimals) return undefined;
    try {
      return parseUnits(outputAmount, buyDecimals);
    } catch {
      return undefined;
    }
  }, [outputAmount, buyDecimals]);

  const exactAmount = useMemo(() => {
    return isExactInput ? amountIn : amountOut;
  }, [isExactInput, amountIn, amountOut]);

  const {
    data: {quotedAmount} = {},
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useMultiHopQuote(poolKey ?? undefined, {
    quoteToken: selectedQuoteToken,
    tokenAddr,
    exactAmount,
    sellingToken,
    exactInput: isExactInput,
    enabled: exactAmount !== undefined && exactAmount > 0n,
  });

  const displayOutputAmount = useMemo(() => {
    if (isExactInput && quotedAmount && buyDecimals) {
      return formatUnits(quotedAmount, buyDecimals);
    }
    if (!outputAmount) return undefined;
    return outputAmount;
  }, [isExactInput, quotedAmount, buyDecimals, outputAmount]);

  const displayInputAmount = useMemo(() => {
    if (!isExactInput && quotedAmount && sellDecimals) {
      return formatUnits(quotedAmount, sellDecimals);
    }
    return inputAmount;
  }, [isExactInput, quotedAmount, sellDecimals, inputAmount]);

  const amountOutMin = useMemo(() => {
    if (!quotedAmount || !slippage) return 0n;
    const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100));
    return quotedAmount - (quotedAmount * slippageBps) / 10000n;
  }, [quotedAmount, slippage]);

  const amountInMax = useMemo(() => {
    if (!quotedAmount || !slippage) return 0n;
    const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100));
    return quotedAmount + (quotedAmount * slippageBps) / 10000n;
  }, [quotedAmount, slippage]);

  const handleSwap = async () => {
    if (!address) {
      toast.error('Wallet not connected');
      return;
    }
    if (!poolKey || !tokenAddr) {
      toast.error('Missing Parameters', {
        description: 'Unable to execute swap with current parameters',
      });
      return;
    }

    const swapDeadline = BigInt(
      Math.floor(Date.now() / 1000) + parseInt(deadline) * 60,
    );
    const isDirect = isDirectSwap(selectedQuoteToken);

    try {
      if (isExactInput) {
        if (!amountIn) {
          toast.error('Missing sell amount');
          return;
        }
        if (amountIn > maxUint128 || amountOutMin > maxUint128) {
          toast.error('Amount exceeds uint128 max');
          return;
        }

        let receipt;
        if (isDirect) {
          // Single-hop USDC swap
          const tokenIsCurrency0 =
            poolKey.currency0.toLowerCase() === tokenAddr.toLowerCase();
          const zeroForOne = sellingToken
            ? tokenIsCurrency0
            : !tokenIsCurrency0;
          receipt = await swapExactInSingle(
            poolKey,
            amountIn,
            amountOutMin,
            zeroForOne,
            swapDeadline,
          );
        } else {
          // Multi-hop swap
          receipt = await swapExactIn(
            poolKey,
            selectedQuoteToken,
            tokenAddr,
            amountIn,
            amountOutMin,
            sellingToken,
            swapDeadline,
          );
        }

        if (receipt.status === 'success') {
          toast.success('Swap completed!', {
            description: `Confirmed in block ${receipt.blockNumber}`,
          });
          setInputAmount('');
          setOutputAmount('');
        } else {
          toast.error('Swap reverted');
        }
      } else {
        if (!amountOut) {
          toast.error('Missing buy amount');
          return;
        }
        if (amountOut > maxUint128 || amountInMax > maxUint128) {
          toast.error('Amount exceeds uint128 max');
          return;
        }

        let receipt;
        if (isDirect) {
          const tokenIsCurrency0 =
            poolKey.currency0.toLowerCase() === tokenAddr.toLowerCase();
          const zeroForOne = sellingToken
            ? tokenIsCurrency0
            : !tokenIsCurrency0;
          receipt = await swapExactOutSingle(
            poolKey,
            amountOut,
            amountInMax,
            zeroForOne,
            swapDeadline,
          );
        } else {
          receipt = await swapExactOut(
            poolKey,
            selectedQuoteToken,
            tokenAddr,
            amountOut,
            amountInMax,
            sellingToken,
            swapDeadline,
          );
        }

        if (receipt.status === 'success') {
          toast.success('Swap completed!', {
            description: `Confirmed in block ${receipt.blockNumber}`,
          });
          setInputAmount('');
          setOutputAmount('');
        } else {
          toast.error('Swap reverted');
        }
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

  const handleFlipTokens = () => {
    const prevInputAmount = inputAmount;
    const prevOutputAmount = outputAmount;
    const wasExactInput = isExactInput;

    setSellingToken(!sellingToken);
    setInputAmount(prevOutputAmount);
    setOutputAmount(prevInputAmount);
    setIsExactInput(!wasExactInput);
  };

  const handleInputChange = (value: string) => {
    setInputAmount(value);
    setIsExactInput(true);
    setOutputAmount('');
  };

  const handleOutputChange = (value: string) => {
    setOutputAmount(value);
    setIsExactInput(false);
    setInputAmount('');
  };

  const handleMaxInput = () => {
    if (sellBalance && sellDecimals) {
      setInputAmount(formatUnits(sellBalance, sellDecimals));
      setIsExactInput(true);
      setOutputAmount('');
    }
  };

  const handleSelectQuoteToken = (qt: QuoteToken) => {
    setSelectedQuoteToken(qt);
    // Reset amounts when switching quote token
    setInputAmount('');
    setOutputAmount('');
  };

  const hasValidAmount = isExactInput
    ? inputAmount && parseFloat(inputAmount) > 0
    : outputAmount && parseFloat(outputAmount) > 0;

  const canSwap =
    isConnected &&
    hasValidAmount &&
    !isSwapPending &&
    !isQuoteLoading &&
    !!poolKey;

  const exchangeRate = useMemo(() => {
    if (!displayOutputAmount || !displayInputAmount) return null;
    const outNum = parseFloat(displayOutputAmount);
    const inNum = parseFloat(displayInputAmount);
    if (!inNum || !outNum) return null;
    return (outNum / inNum).toFixed(6);
  }, [displayOutputAmount, displayInputAmount]);

  // Determine which side gets the token selector
  // The quote token selector appears on the non-launchpad-token side
  const renderTokenLabel = (
    isQuoteSide: boolean,
    symbol: string | undefined,
  ) => {
    if (!isQuoteSide) {
      return (
        <span className="text-green text-xs shrink-0">{symbol || '---'}</span>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setShowTokenSelector(true)}
        className="flex items-center gap-1 text-green text-xs hover:text-foreground transition-colors shrink-0"
      >
        {selectedQuoteToken.symbol}
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
    );
  };

  // The sell side shows the quote selector when selling quote token (!sellingToken)
  // The buy side shows the quote selector when buying quote token (sellingToken)
  const sellIsQuoteSide = !sellingToken;
  const buyIsQuoteSide = sellingToken;

  return (
    <div className="flex flex-col justify-between space-y-3">
      {/* Input Token Section (Sell) */}
      <div className="border border-border bg-background px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-dim uppercase tracking-wider">
            sell
          </span>
          <button
            type="button"
            onClick={handleMaxInput}
            className="text-xs text-dim hover:text-foreground transition-colors"
          >
            bal:{' '}
            <span className="text-purple tabular-nums">
              {sellBalance && sellDecimals
                ? formatUnits(sellBalance, sellDecimals)
                : '-'}
            </span>
            {sellBalance && <span className="ml-1 text-green">[MAX]</span>}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="0.00"
            value={isExactInput ? inputAmount : displayInputAmount || ''}
            onChange={e => handleInputChange(e.target.value)}
            className="flex-1 bg-transparent text-base tabular-nums outline-none placeholder:text-dim w-0 min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {renderTokenLabel(sellIsQuoteSide, sellSymbol)}
        </div>
      </div>

      {/* Flip Button */}
      <div className="relative h-0 flex justify-center z-10">
        <button
          type="button"
          onClick={handleFlipTokens}
          className="absolute -translate-y-1/2 bg-card border border-border p-1.5 hover:border-green hover:text-green transition-colors group"
        >
          <ArrowDownUp className="h-3 w-3 text-dim group-hover:text-green transition-colors" />
        </button>
      </div>

      {/* Output Token Section (Buy) */}
      <div className="border border-border bg-background px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-dim uppercase tracking-wider">buy</span>
          <span className="text-xs text-dim">
            bal:{' '}
            <span className="text-purple tabular-nums">
              {buyBalance && buyDecimals
                ? formatUnits(buyBalance, buyDecimals)
                : '-'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative w-0 min-w-0">
            <input
              type="number"
              placeholder="0.00"
              value={isExactInput ? displayOutputAmount || '' : outputAmount}
              onChange={e => handleOutputChange(e.target.value)}
              className={cn(
                'w-full bg-transparent text-base tabular-nums outline-none placeholder:text-dim [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                isQuoteLoading && 'opacity-50',
              )}
            />
            {isQuoteLoading && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2">
                <Loader type="dots" className="text-green" />
              </div>
            )}
          </div>
          {renderTokenLabel(buyIsQuoteSide, buySymbol)}
        </div>
      </div>

      {/* Route indicator for multi-hop */}
      {!isDirectSwap(selectedQuoteToken) && (
        <div className="text-center">
          <span className="text-[10px] text-dim">
            route: {sellingToken ? tokenSymbol : selectedQuoteToken.symbol}
            {' -> USDC -> '}
            {sellingToken ? selectedQuoteToken.symbol : tokenSymbol}
          </span>
        </div>
      )}

      {/* Quote Info */}
      {(quoteError || exchangeRate) && (
        <div className="py-2 text-center">
          {quoteError ? (
            <p className="text-xs text-red">// error: failed to fetch quote</p>
          ) : exchangeRate ? (
            <div className="text-xs text-dim space-y-0.5">
              <div className="tabular-nums">
                <span className="text-purple">1</span> {sellSymbol}{' '}
                <span className="text-dim">=</span>{' '}
                <span className="text-green">{exchangeRate}</span> {buySymbol}
              </div>
              {isExactInput && amountOutMin > 0n && buyDecimals && (
                <div className="text-dim">
                  min:{' '}
                  <span className="text-purple tabular-nums">
                    {Number(formatUnits(amountOutMin, buyDecimals)).toFixed(4)}
                  </span>{' '}
                  {buySymbol}
                </div>
              )}
              {!isExactInput && amountInMax > 0n && sellDecimals && (
                <div className="text-dim">
                  max:{' '}
                  <span className="text-purple tabular-nums">
                    {formatUnits(amountInMax, sellDecimals)}
                  </span>{' '}
                  {sellSymbol}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Collapsible Settings */}
      <div className="border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-dim hover:text-foreground transition-colors"
        >
          <span>
            slippage: <span className="text-purple">{slippage}%</span> |
            deadline: <span className="text-purple">{deadline}m</span>
          </span>
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              showSettings && 'rotate-180',
            )}
          />
        </button>
        <div
          className={cn(
            'grid transition-all duration-200 ease-in-out',
            showSettings
              ? 'grid-rows-[1fr] opacity-100'
              : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3 pt-2 grid grid-cols-2 gap-3 border-t border-border">
              <div className="space-y-1">
                <label className="text-xs text-dim">slippage (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={slippage}
                  onChange={e => setSlippage(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-dim">deadline (min)</label>
                <Input
                  type="number"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <Button className="w-full h-10" onClick={handleSwap} disabled={!canSwap}>
        {isSwapPending ? (
          <>
            <Loader type="dots" className="mr-2" />
            swapping...
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
          '$ swap'
        )}
      </Button>

      {/* Token Selector Modal */}
      <TokenSelectorModal
        open={showTokenSelector}
        onOpenChange={setShowTokenSelector}
        selectedToken={selectedQuoteToken}
        onSelect={handleSelectQuoteToken}
      />
    </div>
  );
};
