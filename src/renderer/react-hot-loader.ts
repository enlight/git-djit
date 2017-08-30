export * from 'react-hot-loader';

// Augment the NodeModule interface to account for `electron-compile` shenanigans.
declare global {
  /* tslint:disable-next-line:interface-name */
  interface NodeModule {
    hot?: {
      accept(render: () => void): void;
    };
  }
}
