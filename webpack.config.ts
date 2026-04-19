import type { Configuration, RuleSetRule } from 'webpack';
import grafanaConfig, { type Env } from './.config/webpack/webpack.config.ts';

const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  // Enable automatic JSX runtime so React doesn't need to be in scope for JSX.
  // Biome's useImportType rule converts `import React from 'react'` to type-only
  // imports, which are erased at compile time — incompatible with classic transform.
  for (const rule of baseConfig.module?.rules ?? []) {
    const r = rule as RuleSetRule;
    if (r && typeof r.use === 'object' && !Array.isArray(r.use)) {
      const use = r.use as { loader?: string; options?: Record<string, unknown> };
      if (use.loader === 'swc-loader') {
        const jsc = (use.options?.jsc ?? {}) as Record<string, unknown>;
        use.options = {
          ...use.options,
          jsc: {
            ...jsc,
            transform: {
              // development: false forces use of react/jsx-runtime in all builds.
              // react/jsx-dev-runtime (used by default in dev mode) may not be
              // registered in older Grafana AMD loaders, causing jsxDEV to be undefined.
              react: { runtime: 'automatic', development: false },
            },
          },
        };
      }
    }
  }

  return baseConfig;
};

export default config;
