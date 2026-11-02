// Type contract for run-check: the draft the prompt box holds, the person's effort
// adjustment for it, whether its card is hidden, the effort the next turn uses, when the
// main loop last finished (for the cache estimate), and a tick that redraws the strip.
export type Draft = string;
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

declare module 'claude-code' {
  interface PluginState {
    'run-check': {
      draft: Shaped<Draft>;
      adjust: Shaped<number>;
      hidden: Shaped<boolean>;
      pending: Shaped<string>;
      lastEnd: Shaped<number>;
      tick: Shaped<number>;
    };
  }
}
