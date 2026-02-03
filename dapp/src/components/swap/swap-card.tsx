'use client';

import {useState, useMemo} from 'react';
import {maxUint128, parseUnits, formatUnits} from 'viem';
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
import {useQuote} from '~/hooks/swap/use-quote';

interface SwapCardProps {
  poolKey?: PoolKey | null;
}

export const SwapCard = ({poolKey}: SwapCardProps) => {
  const queryClient = useQueryClient();
  const token0 = poolKey?.currency0;
  const token1 = poolKey?.currency1;

  const {data: {symbol: token0Symbol, decimals: token0Decimals} = {}} =
    useTokenData(poolKey?.currency0);
  const {data: {symbol: token1Symbol, decimals: token1Decimals} = {}} =
    useTokenData(poolKey?.currency1);

  const {address, isConnected} = useConnection();

  const {
    swapExactInSingle,
    swapExactOutSingle,
    isPending: isSwapPending,
  } = useSwap();

  const [inputAmount, setInputAmount] = useState('');
  const [zeroForOne, setZeroForOne] = useState(false);
  const [isExactInput, setIsExactInput] = useState(true);
  const [slippage, setSlippage] = useState('1');
  const [deadline, setDeadline] = useState('20');
  const [showSettings, setShowSettings] = useState(false);
  const [outputAmount, setOutputAmount] = useState('');

  const tokenIn = zeroForOne ? token0 : token1;
  const tokenOut = zeroForOne ? token1 : token0;
  const tokenInDecimals = zeroForOne ? token0Decimals : token1Decimals;
  const tokenOutDecimals = zeroForOne ? token1Decimals : token0Decimals;
  const tokenInSymbol = zeroForOne ? token0Symbol : token1Symbol;
  const tokenOutSymbol = zeroForOne ? token1Symbol : token0Symbol;

  const {data: tokenInBalance} = useTokenBalance(tokenIn, address);
  const {data: tokenOutBalance} = useTokenBalance(tokenOut, address);

  const amountIn = useMemo(() => {
    if (!inputAmount || !tokenInDecimals) return undefined;
    try {
      return parseUnits(inputAmount, tokenInDecimals);
    } catch {
      return undefined;
    }
  }, [inputAmount, tokenInDecimals]);

  const amountOut = useMemo(() => {
    if (!outputAmount || !tokenOutDecimals) return undefined;
    try {
      return parseUnits(outputAmount, tokenOutDecimals);
    } catch {
      return undefined;
    }
  }, [outputAmount, tokenOutDecimals]);

  const exactAmount = useMemo(() => {
    if (isExactInput) {
      return amountIn;
    } else {
      return amountOut;
    }
  }, [isExactInput, amountIn, amountOut]);

  const {
    data: {quotedAmount} = {},
    isLoading: isQuoteLoading,
    error: quoteError,
  } = useQuote(poolKey ?? undefined, {
    exactAmount,
    zeroForOne: zeroForOne,
    exactInput: isExactInput,
    enabled: exactAmount !== undefined && exactAmount > 0n,
  });

  const displayOutputAmount = useMemo(() => {
    if (isExactInput && quotedAmount && tokenOutDecimals) {
      return formatUnits(quotedAmount, tokenOutDecimals);
    }
    if (!outputAmount) return undefined;
    return outputAmount;
  }, [isExactInput, quotedAmount, tokenOutDecimals, outputAmount]);

  const displayInputAmount = useMemo(() => {
    if (!isExactInput && quotedAmount && tokenInDecimals) {
      return formatUnits(quotedAmount, tokenInDecimals);
    }
    return inputAmount;
  }, [isExactInput, quotedAmount, tokenInDecimals, inputAmount]);

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

    if (!poolKey) {
      toast.error('Missing Parameters', {
        description: 'Unable to execute swap with current parameters',
      });
      return;
    }
    const swapDeadline = BigInt(
      Math.floor(Date.now() / 1000) + parseInt(deadline) * 60,
    );

    try {
      if (!amountIn) {
        toast.error('Missing sell amount');
        return;
      }
      if (isExactInput) {
        if (amountIn > maxUint128 || amountOutMin > maxUint128) {
          toast.error('Amount exceeds uint128 max');
          return;
        }
        const receipt = await swapExactInSingle(
          poolKey,
          amountIn,
          amountOutMin,
          zeroForOne,
          swapDeadline,
        );
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
        const receipt = await swapExactOutSingle(
          poolKey,
          amountOut,
          amountInMax,
          zeroForOne,
          swapDeadline,
        );
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

    setZeroForOne(!zeroForOne);
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
    if (tokenInBalance && tokenInDecimals) {
      setInputAmount(formatUnits(tokenInBalance, tokenInDecimals));
      setIsExactInput(true);
      setOutputAmount('');
    }
  };

  const isLoading = isSwapPending;

  const hasValidAmount = isExactInput
    ? inputAmount && parseFloat(inputAmount) > 0
    : outputAmount && parseFloat(outputAmount) > 0;

  const canSwap =
    isConnected && hasValidAmount && !isLoading && !isQuoteLoading && !!poolKey;

  const exchangeRate = useMemo(() => {
    if (!displayOutputAmount || !displayInputAmount) return null;
    const outNum = parseFloat(displayOutputAmount);
    const inNum = parseFloat(displayInputAmount);
    if (!inNum || !outNum) return null;
    return (outNum / inNum).toFixed(6);
  }, [displayOutputAmount, displayInputAmount]);

  return (
    <div className="flex flex-col justify-between space-y-3">
      {/* Input Token Section */}
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
              {tokenInBalance && tokenInDecimals
                ? formatUnits(tokenInBalance, tokenInDecimals)
                : '-'}
            </span>
            {tokenInBalance && <span className="ml-1 text-green">[MAX]</span>}
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
          <span className="text-green text-xs shrink-0">
            {tokenInSymbol || '---'}
          </span>
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

      {/* Output Token Section */}
      <div className="border border-border bg-background px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-dim uppercase tracking-wider">buy</span>
          <span className="text-xs text-dim">
            bal:{' '}
            <span className="text-purple tabular-nums">
              {tokenOutBalance && tokenOutDecimals
                ? formatUnits(tokenOutBalance, tokenOutDecimals)
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
          <span className="text-green text-xs shrink-0">
            {tokenOutSymbol || '---'}
          </span>
        </div>
      </div>

      {/* Quote Info */}
      {(quoteError || exchangeRate) && (
        <div className="py-2 text-center">
          {quoteError ? (
            <p className="text-xs text-red">// error: failed to fetch quote</p>
          ) : exchangeRate ? (
            <div className="text-xs text-dim space-y-0.5">
              <div className="tabular-nums">
                <span className="text-purple">1</span> {tokenInSymbol}{' '}
                <span className="text-dim">=</span>{' '}
                <span className="text-green">{exchangeRate}</span>{' '}
                {tokenOutSymbol}
              </div>
              {isExactInput && amountOutMin > 0n && tokenOutDecimals && (
                <div className="text-dim">
                  min:{' '}
                  <span className="text-purple tabular-nums">
                    {Number(
                      formatUnits(amountOutMin, tokenOutDecimals),
                    ).toFixed(4)}
                  </span>{' '}
                  {tokenOutSymbol}
                </div>
              )}
              {!isExactInput && amountInMax > 0n && tokenInDecimals && (
                <div className="text-dim">
                  max:{' '}
                  <span className="text-purple tabular-nums">
                    {formatUnits(amountInMax, tokenInDecimals)}
                  </span>{' '}
                  {tokenInSymbol}
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
    </div>
  );
};
