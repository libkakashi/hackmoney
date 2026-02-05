import {
  mineSalt,
  serializeParams,
  serializeConfig,
  type SaltMiningParams,
  type LaunchpadConfig,
  type SaltMiningResult,
} from './compute';
import type {WorkerMessage, WorkerResponse} from './worker';

export const mineSaltAsync = async (
  params: SaltMiningParams,
  config: LaunchpadConfig,
  maxIterations = 1_000_000,
  onProgress?: (iteration: number) => void,
): Promise<SaltMiningResult> => {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return mineSalt(params, config, maxIterations, onProgress);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      switch (response.type) {
        case 'progress':
          onProgress?.(response.iteration!);
          break;
        case 'result':
          worker.terminate();
          resolve(response.result!);
          break;
        case 'error':
          worker.terminate();
          reject(new Error(response.error));
          break;
      }
    };

    worker.onerror = error => {
      worker.terminate();
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.postMessage({
      type: 'start',
      params: serializeParams(params),
      config: serializeConfig(config),
      maxIterations,
    } satisfies WorkerMessage);
  });
};
