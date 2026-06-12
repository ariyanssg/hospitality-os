import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface FlowSpec {
  id: string;
  route: string;
  timeBudgetSeconds: number;
  interactionBudget: number;
  keyboardOnly: boolean;
  sourceFiles: string[];
  requiredSelectors: string[];
}

const root = process.cwd();
const flows = JSON.parse(
  readFileSync(join(root, 'tooling/check-desk-golden-flows/flows.json'), 'utf8'),
) as FlowSpec[];

const errors: string[] = [];

for (const flow of flows) {
  if (!flow.id) errors.push('A golden flow is missing id');
  if (!flow.route?.startsWith('/')) errors.push(`${flow.id}: route must be absolute`);
  if (!flow.keyboardOnly) errors.push(`${flow.id}: keyboardOnly must be true`);
  if (!Number.isFinite(flow.timeBudgetSeconds) || flow.timeBudgetSeconds <= 0) {
    errors.push(`${flow.id}: timeBudgetSeconds must be positive`);
  }
  if (!Number.isInteger(flow.interactionBudget) || flow.interactionBudget <= 0) {
    errors.push(`${flow.id}: interactionBudget must be a positive integer`);
  }
  if (!flow.sourceFiles.length) errors.push(`${flow.id}: sourceFiles is empty`);
  if (!flow.requiredSelectors.length) errors.push(`${flow.id}: requiredSelectors is empty`);

  const source = flow.sourceFiles
    .map((file) => {
      try {
        return readFileSync(join(root, file), 'utf8');
      } catch {
        errors.push(`${flow.id}: source file missing: ${file}`);
        return '';
      }
    })
    .join('\n');

  for (const selector of flow.requiredSelectors) {
    if (!source.includes(selector)) {
      errors.push(`${flow.id}: missing selector ${selector}`);
    }
  }

  if (
    !source.includes('onKeyDown') &&
    !source.includes("e.key === 'Enter'") &&
    !source.includes('<button') &&
    !source.includes('autoFocus')
  ) {
    errors.push(`${flow.id}: no keyboard activation evidence in source files`);
  }
  if (flow.id.includes('checkin') && flow.timeBudgetSeconds > 60) {
    errors.push(`${flow.id}: check-in budget exceeds doc 18 limit`);
  }
  if (flow.id.includes('checkout') && flow.interactionBudget > 3) {
    errors.push(`${flow.id}: checkout interaction budget exceeds doc 18 limit`);
  }
  if (flow.id.includes('walkin') && flow.interactionBudget > 12) {
    errors.push(`${flow.id}: walk-in interaction budget exceeds doc 18 limit`);
  }
}

if (errors.length) {
  console.error('Desk golden-flow check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`✓ Desk golden-flow contracts OK — ${flows.length} keyboard-only flows budgeted.`);
