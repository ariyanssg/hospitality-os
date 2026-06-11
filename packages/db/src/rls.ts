/**
 * RLS framework (doc 05 §2). Generates ENABLE + FORCE + tenant/property isolation policies for
 * every tenant-scoped table. Policies are fail-closed: a missing `SET LOCAL app.tenant_id` makes
 * `current_setting(...)` return NULL, so the predicate matches ZERO rows — never all rows.
 *
 * `tooling/check-rls` independently introspects pg_catalog and fails CI if ANY table carrying a
 * `tenant_id` column lacks an enabled+forced policy — this generator is the thing that satisfies it.
 */

export interface TenantTable {
  name: string;
  /** Table has a property_id column → also gets the property-scope policy. */
  property: boolean;
  /** tenant_id is nullable (system/corporate rows) → policy also admits NULL tenant rows. */
  tenantNullable?: boolean;
  /** property_id is nullable (tenant-wide rows always visible). */
  propertyNullable?: boolean;
}

/** Every table carrying tenant_id. Identity tables (users/sessions/accounts/verifications) are global. */
export const TENANT_TABLES: TenantTable[] = [
  { name: 'properties', property: false },
  { name: 'tenant_memberships', property: false },
  { name: 'roles', property: false, tenantNullable: true },
  { name: 'role_assignments', property: true, propertyNullable: true },
  { name: 'outbox_events', property: true, propertyNullable: true },
  { name: 'audit_log', property: true, propertyNullable: true },
  { name: 'business_dates', property: true },
  { name: 'idempotency_keys', property: false },

  { name: 'room_types', property: true },
  { name: 'rooms', property: true },
  { name: 'availability_days', property: true },
  { name: 'out_of_order_periods', property: true },

  { name: 'rate_plans', property: true },
  { name: 'rate_prices', property: true },
  { name: 'rate_restrictions', property: true },

  { name: 'guests', property: false },
  { name: 'reservations', property: true },
  { name: 'reservation_nights', property: true },
  { name: 'reservation_room_stays', property: true },
  { name: 'reservation_guests', property: false },
  { name: 'reservation_status_log', property: true },

  { name: 'charge_codes', property: true, propertyNullable: true },
  { name: 'tax_rules', property: true, propertyNullable: true },
  { name: 'folios', property: true },
  { name: 'folio_postings', property: true },
  { name: 'posting_taxes', property: true },
  { name: 'payments', property: true },
  { name: 'cashier_sessions', property: true },

  { name: 'gl_accounts', property: true, propertyNullable: true },
  { name: 'cost_centers', property: true, propertyNullable: true },
  { name: 'journal_entries', property: true },
  { name: 'journal_lines', property: true },
];

const TENANT_EXPR = `NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
const PROPERTY_IDS_EXPR = `NULLIF(current_setting('app.property_ids', true), '')`;

function tenantPredicate(t: TenantTable): string {
  const base = `tenant_id = ${TENANT_EXPR}`;
  return t.tenantNullable ? `(tenant_id IS NULL OR ${base})` : base;
}

function propertyPredicate(t: TenantTable): string {
  // No property context set → tenant-wide read (all properties the membership permits).
  // Tenant-wide rows (property_id IS NULL) are always visible.
  const nullClause = t.propertyNullable ? `property_id IS NULL OR ` : '';
  return `(${nullClause}${PROPERTY_IDS_EXPR} IS NULL OR property_id = ANY (string_to_array(${PROPERTY_IDS_EXPR}, ',')::uuid[]))`;
}

/** Full idempotent SQL to (re)apply RLS to every tenant table. */
export function generateRlsSql(): string {
  const blocks = TENANT_TABLES.map((t) => {
    const lines = [
      `ALTER TABLE ${t.name} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${t.name} FORCE ROW LEVEL SECURITY;`,
      `DROP POLICY IF EXISTS tenant_isolation ON ${t.name};`,
      `CREATE POLICY tenant_isolation ON ${t.name} USING (${tenantPredicate(t)}) WITH CHECK (${tenantPredicate(t)});`,
    ];
    if (t.property) {
      // RESTRICTIVE so it ANDs with tenant_isolation instead of ORing (permissive policies are
      // OR-combined). Without this, the permissive property predicate — which is TRUE for a
      // tenant-wide context — would satisfy an INSERT's WITH CHECK on its own and let a row be
      // written for a DIFFERENT tenant. Restrictive + WITH CHECK closes that write-path hole.
      lines.push(
        `DROP POLICY IF EXISTS property_scope ON ${t.name};`,
        `CREATE POLICY property_scope ON ${t.name} AS RESTRICTIVE USING (${propertyPredicate(t)}) WITH CHECK (${propertyPredicate(t)});`,
      );
    }
    return `-- ${t.name}\n${lines.join('\n')}`;
  });
  return blocks.join('\n\n') + '\n';
}
