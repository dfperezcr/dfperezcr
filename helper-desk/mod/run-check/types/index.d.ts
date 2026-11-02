// Type contract for run-check: the draft the prompt box holds, shown above it.
export type Draft = string;

declare module 'claude-code' {
  interface PluginState {
    'run-check': {
      draft: Shaped<Draft>;
    };
  }
}
