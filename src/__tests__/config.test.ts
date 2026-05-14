import { configureSvgFetch, getConfig } from '../config';

beforeEach(() => configureSvgFetch({ persistCache: false }));

describe('configureSvgFetch', () => {
  it('defaults persistCache to false', () => {
    expect(getConfig().persistCache).toBe(false);
  });

  it('sets persistCache to true', () => {
    configureSvgFetch({ persistCache: true });
    expect(getConfig().persistCache).toBe(true);
  });

  it('can reset persistCache back to false', () => {
    configureSvgFetch({ persistCache: true });
    configureSvgFetch({ persistCache: false });
    expect(getConfig().persistCache).toBe(false);
  });
});
