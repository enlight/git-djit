// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

declare global {
  /**
   * Interface for experimental ResizeObserver API (https://wicg.github.io/ResizeObserver/)
   * This API can be enabled in Electron by adding `ResizeObserver` to BrowserWindow
   * webPreferences->blinkFeatures.
   */
  class ResizeObserver {
    constructor(callback: ResizeObserverCallback);
    observe(target: Element): void;
    unobserve(target: Element): void;
    disconnect(): void;
  }

  type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

  class ResizeObserverEntry {
    target: Element;
    contentRect: Readonly<ClientRect>;

    constructor(target: Element);
  }
}

// This empty export is required in order to force TypeScript to interpret this file as an external
// module so that `declare global` works.
export {};
