/**
 * Permission-guard coverage gate (doc 06 §6, IMPLEMENTATION §3).
 *
 * Every controller route handler MUST declare its authorization: `@RequirePermission(...)`,
 * `@Public()`, or `@AuthenticatedOnly()`. A route with none is a fail-closed hole and fails CI.
 * Additionally, every key passed to `@RequirePermission` must exist in the permission catalog.
 *
 * Static analysis over the TypeScript AST — no need to boot Nest.
 *
 *     pnpm check:permissions
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { ALL_PERMISSION_KEYS } from '@vela/permissions';

const API_SRC = join(import.meta.dirname, '..', '..', 'apps', 'api', 'src');
const HTTP_METHODS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head', 'All']);
const AUTHZ = new Set(['RequirePermission', 'Public', 'AuthenticatedOnly']);
const catalog = new Set<string>(ALL_PERMISSION_KEYS);

interface Finding {
  file: string;
  line: number;
  message: string;
}

function decoratorName(d: ts.Decorator): string | undefined {
  const expr = d.expression;
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) return expr.expression.text;
  if (ts.isIdentifier(expr)) return expr.text;
  return undefined;
}

function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  return ts.canHaveDecorators(node) ? (ts.getDecorators(node) ?? []) : [];
}

function checkFile(file: string, findings: Finding[]): { routes: number } {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let routes = 0;

  const lineOf = (node: ts.Node) => src.getLineAndCharacterOfPosition(node.getStart(src)).line + 1;

  src.forEachChild(function visit(node) {
    if (ts.isClassDeclaration(node)) {
      const classDecos = decoratorsOf(node).map(decoratorName);
      const isController = classDecos.includes('Controller');
      const classHasAuthz = decoratorsOf(node).some((d) => AUTHZ.has(decoratorName(d) ?? ''));

      if (isController) {
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member)) continue;
          const decos = decoratorsOf(member);
          const names = decos.map(decoratorName);
          const httpDeco = decos.find((d) => HTTP_METHODS.has(decoratorName(d) ?? ''));
          if (!httpDeco) continue;
          routes++;

          const hasAuthz = classHasAuthz || names.some((n) => AUTHZ.has(n ?? ''));
          const methodName = ts.isIdentifier(member.name) ? member.name.text : '<anon>';
          if (!hasAuthz) {
            findings.push({
              file,
              line: lineOf(member),
              message: `${node.name?.text}.${methodName}() has no @RequirePermission/@Public/@AuthenticatedOnly`,
            });
          }

          // Validate permission keys against the catalog.
          for (const d of decos) {
            if (decoratorName(d) !== 'RequirePermission') continue;
            const call = d.expression as ts.CallExpression;
            for (const arg of call.arguments) {
              if (ts.isStringLiteral(arg) && !catalog.has(arg.text)) {
                findings.push({
                  file,
                  line: lineOf(member),
                  message: `${node.name?.text}.${methodName}() requires unknown permission '${arg.text}'`,
                });
              }
            }
          }
        }
      }
    }
    node.forEachChild(visit);
  });

  return { routes };
}

function findControllers(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.controller.ts'))
    .map((f) => join(dir, f));
}

async function main(): Promise<void> {
  const files = findControllers(API_SRC);
  if (files.length === 0) {
    console.error('check-permissions: no controllers found under apps/api/src');
    process.exit(1);
  }

  const findings: Finding[] = [];
  let totalRoutes = 0;
  for (const file of files.sort()) {
    totalRoutes += checkFile(file, findings).routes;
  }

  if (findings.length > 0) {
    console.error(`✖ Permission-guard coverage FAILED — ${findings.length} issue(s):`);
    for (const f of findings) {
      console.error(`  · ${f.file.replace(process.cwd(), '.')}:${f.line} — ${f.message}`);
    }
    process.exit(1);
  }
  console.warn(
    `✓ Permission-guard coverage OK — ${totalRoutes} routes across ${files.length} controllers all declare authorization.`,
  );
}

main().catch((err) => {
  console.error('check-permissions failed:', err);
  process.exit(1);
});
