// Type contract for run-check: the draft the prompt box holds, the person's effort
// adjustment for it, whether its band is hidden, and the effort the next turn uses.
export type Draft = string;
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

declare module 'claude-code' {
  interface PluginState {
    'run-check': {
      draft: Shaped<Draft>;
      adjust: Shaped<number>;
      hidden: Shaped<boolean>;
      pending: Shaped<string>;
    };
  }
}
