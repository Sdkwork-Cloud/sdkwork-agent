/**
 * No-op module for browser compatibility
 * Replaces Node.js specific modules in browser builds
 */

export const noop = (): void => {};

export const createNoopModule = (moduleName: string) => {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`${moduleName} is not available in browser environment`);
      },
    }
  );
};

export default createNoopModule;
