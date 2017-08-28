export * from 'react-hot-loader';

// Augment the NodeModule interface to account for Webpack Hot Reloader shenanigans.
declare global {
  interface NodeModule {
    hot?: {
      accept(render: () => void): void;
    };
  }
}
