// Type contract for helper-desk-pane: the values its module keeps in $.state.
export type Count = { id: string; tools: number; tokens: number };

declare module 'claude-code' {
  interface PluginState {
    'helper-desk-pane': {
      counts: Shaped<Count[]>;
      tick: Shaped<number>;
    };
  }
}
