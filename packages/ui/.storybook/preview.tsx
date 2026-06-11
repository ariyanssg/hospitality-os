import type { Preview, Decorator } from '@storybook/react';
import '../src/styles/index.css';

/**
 * Global toolbar controls for the state × density × theme matrix (doc 17 §4): every component is
 * inspected across themes (light/dark) and densities (comfortable/compact/touch) from one contract.
 */
const withMatrix: Decorator = (Story, ctx) => {
  const theme = ctx.globals.theme ?? 'dark';
  const density = ctx.globals.density ?? 'comfortable';
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
  return (
    <div data-density={density} style={{ background: 'var(--bg-canvas)', color: 'var(--ink-primary)', padding: 24 }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: { layout: 'fullscreen', controls: { expanded: true } },
  globalTypes: {
    theme: {
      description: 'Theme',
      defaultValue: 'dark',
      toolbar: { icon: 'circlehollow', items: ['light', 'dark'], dynamicTitle: true },
    },
    density: {
      description: 'Density',
      defaultValue: 'comfortable',
      toolbar: { icon: 'component', items: ['comfortable', 'compact', 'touch'], dynamicTitle: true },
    },
  },
  decorators: [withMatrix],
};
export default preview;
