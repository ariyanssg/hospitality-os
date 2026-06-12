import { ALL_PERMISSION_KEYS } from './catalog';

/**
 * Expands wildcard patterns to concrete catalog keys. Wildcards expand at role-save time so the
 * runtime decision set is always a flat set of concrete strings — evaluation is a hash lookup (doc 06 §1).
 *   `*`            → every permission in the universe
 *   `reservation.*`→ every key beginning `reservation.`
 * The universe defaults to the tenant catalog; platform roles expand against
 * PLATFORM_PERMISSION_KEYS instead, so tenant `'*'` can never reach platform keys.
 */
export function expandWildcards(
  patterns: readonly string[],
  universe: readonly string[] = ALL_PERMISSION_KEYS,
): string[] {
  const out = new Set<string>();
  for (const pattern of patterns) {
    if (pattern === '*') {
      for (const k of universe) out.add(k);
    } else if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -1); // retains trailing dot
      for (const k of universe) if (k.startsWith(prefix)) out.add(k);
    } else {
      out.add(pattern);
    }
  }
  return [...out];
}

/**
 * A user's flattened, scope-resolved decision set for the active context. Explicit deny grants
 * override allows (doc 06 §1). `has()` is O(1).
 */
export class PermissionSet {
  private readonly granted: ReadonlySet<string>;
  private readonly denied: ReadonlySet<string>;

  constructor(granted: Iterable<string>, denied: Iterable<string> = []) {
    this.granted = new Set(granted);
    this.denied = new Set(denied);
  }

  static from(grantedPatterns: readonly string[], deniedPatterns: readonly string[] = []): PermissionSet {
    return new PermissionSet(expandWildcards(grantedPatterns), expandWildcards(deniedPatterns));
  }

  has(key: string): boolean {
    return !this.denied.has(key) && this.granted.has(key);
  }

  hasAll(keys: readonly string[]): boolean {
    return keys.every((k) => this.has(k));
  }

  hasAny(keys: readonly string[]): boolean {
    return keys.some((k) => this.has(k));
  }

  toArray(): string[] {
    return [...this.granted].filter((k) => !this.denied.has(k)).sort();
  }
}
