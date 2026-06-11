import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Tier A/Button',
  component: Button,
  args: { children: 'Post charge' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger', 'link'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Refund payment' } };
export const Loading: Story = { args: { loading: true, children: 'Posting…' } };

/** The matrix the design system promises: all variants visible together (×theme ×density via toolbar). */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {(['primary', 'secondary', 'ghost', 'danger', 'link'] as const).map((v) => (
        <Button key={v} variant={v}>
          {v}
        </Button>
      ))}
    </div>
  ),
};
