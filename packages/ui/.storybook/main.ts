import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Atrium showroom (doc 17 §7: Storybook doubles as the engineering showroom). Run after installing
 * the storybook devDependencies: `pnpm --filter @vela/ui storybook`.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
};
export default config;
