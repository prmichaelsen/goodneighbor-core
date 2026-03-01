import { assertServerSide } from './guard';

describe('assertServerSide', () => {
  const originalWindow = (globalThis as any).window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
  });

  it('does not throw in Node.js environment', () => {
    delete (globalThis as any).window;
    expect(() => assertServerSide()).not.toThrow();
  });

  it('throws when window is defined', () => {
    (globalThis as any).window = {};
    expect(() => assertServerSide()).toThrow(
      '@prmichaelsen/goodneighbor-core client SDKs are server-side only',
    );
  });
});
