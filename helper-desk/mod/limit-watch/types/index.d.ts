// Type contract for limit-watch: the values its module keeps in $.state.
// resetsAt is the window's reset time as reported ('' when unknown); level is the
// highest alert threshold already shown for that window (0 when none).
export type Window = { resetsAt: string; level: number };

declare module 'claude-code' {
  interface PluginState {
    'limit-watch': {
      window: Shaped<Window>;
    };
  }
}
