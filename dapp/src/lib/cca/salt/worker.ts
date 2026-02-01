import {
  mineSalt,
  deserializeParams,
  deserializeConfig,
  type SerializedSaltMiningParams,
  type SerializedLaunchpadConfig,
  type SaltMiningResult,
} from './compute';

const PROGRESS_INTERVAL = 10_000;

export interface WorkerMessage {
  type: 'start';
  params: SerializedSaltMiningParams;
  config: SerializedLaunchpadConfig;
  maxIterations: number;
}

export interface WorkerResponse {
  type: 'progress' | 'result' | 'error';
  iteration?: number;
  result?: SaltMiningResult;
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const {params, config, maxIterations} = event.data;

  try {
    const result = mineSalt(
      deserializeParams(params),
      deserializeConfig(config),
      maxIterations,
      iteration => {
        if (iteration % PROGRESS_INTERVAL === 0) {
          self.postMessage({
            type: 'progress',
            iteration,
          } satisfies WorkerResponse);
        }
      },
    );

    self.postMessage({type: 'result', result} satisfies WorkerResponse);
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse);
  }
};
