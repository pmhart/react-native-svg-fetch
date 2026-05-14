interface SvgFetchConfig {
  persistCache: boolean;
}

let config: SvgFetchConfig = {
  persistCache: false,
};

export function configureSvgFetch(options: Partial<SvgFetchConfig>): void {
  config = { ...config, ...options };
}

export function getConfig(): Readonly<SvgFetchConfig> {
  return config;
}
