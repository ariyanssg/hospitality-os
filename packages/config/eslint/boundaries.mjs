import boundaries from 'eslint-plugin-boundaries';
import graph from '../../../tooling/module-graph.json' with { type: 'json' };

/**
 * Module-boundary enforcement (doc 04 §1, doc 14 §1).
 *
 * - Each API module is a `boundaries` element captured by its folder name.
 * - `element-types` allows a module to import only the modules declared for it in
 *   tooling/module-graph.json (which mirrors the architecture's dependency graph).
 *   Every undeclared edge — and every cycle — is a CI failure.
 * - `entry-point` forces cross-module imports to go through the owning module's
 *   public `index.ts`; reaching into another module's internals is blocked.
 */
const elementTypesRules = Object.entries(graph.modules).map(([name, allowed]) => ({
  from: [['apiModule', { moduleName: name }]],
  allow: [
    ['apiModule', { moduleName: name }],
    ...allowed.map((dep) => ['apiModule', { moduleName: dep }]),
  ],
}));

export default [
  {
    files: ['apps/api/src/modules/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['apps/api/src/modules/**/*'],
      'boundaries/elements': [
        {
          type: 'apiModule',
          pattern: 'apps/api/src/modules/*',
          mode: 'folder',
          capture: ['moduleName'],
        },
      ],
    },
    rules: {
      'boundaries/element-types': ['error', { default: 'disallow', rules: elementTypesRules }],
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [{ target: ['apiModule'], allow: 'index.ts' }],
        },
      ],
    },
  },
];
