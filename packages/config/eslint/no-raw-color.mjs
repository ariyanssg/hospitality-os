/**
 * Bans raw hex colors and Tailwind palette color classes outside `packages/ui`
 * (doc 17 §7 governance: "lint rule blocks raw hex/tailwind-palette colors … outside packages/ui").
 * All color must flow through the three-tier semantic token system.
 */
const HEX = /#[0-9a-fA-F]{3,8}\b/;
const PALETTE =
  /\b(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/;

function check(value) {
  return typeof value === 'string' && (HEX.test(value) || PALETTE.test(value));
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow raw colors outside packages/ui.' },
    messages: {
      raw: 'Raw color "{{value}}" is banned outside packages/ui — use a semantic token (doc 17 §2,§7).',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (check(node.value)) {
          context.report({ node, messageId: 'raw', data: { value: String(node.value) } });
        }
      },
      TemplateElement(node) {
        if (check(node.value.raw)) {
          context.report({ node, messageId: 'raw', data: { value: node.value.raw } });
        }
      },
    };
  },
};

export default [
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    ignores: ['packages/ui/**'],
    plugins: { vela: { rules: { 'no-raw-color': rule } } },
    rules: { 'vela/no-raw-color': 'error' },
  },
];
