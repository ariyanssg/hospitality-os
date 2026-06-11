-- Vela financial invariants enforced in the database itself (doc 04 §2, doc 07 §1).

-- 1) Immutability: folio_postings and the ledger are append-only. Corrections are reversal rows.
CREATE OR REPLACE FUNCTION vela_forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only; corrections must be reversal rows (doc 07 §1).', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS folio_postings_immutable ON folio_postings;
CREATE TRIGGER folio_postings_immutable BEFORE UPDATE OR DELETE ON folio_postings
  FOR EACH ROW EXECUTE FUNCTION vela_forbid_mutation();

DROP TRIGGER IF EXISTS posting_taxes_immutable ON posting_taxes;
CREATE TRIGGER posting_taxes_immutable BEFORE UPDATE OR DELETE ON posting_taxes
  FOR EACH ROW EXECUTE FUNCTION vela_forbid_mutation();

DROP TRIGGER IF EXISTS journal_lines_immutable ON journal_lines;
CREATE TRIGGER journal_lines_immutable BEFORE UPDATE OR DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION vela_forbid_mutation();

DROP TRIGGER IF EXISTS journal_entries_immutable ON journal_entries;
CREATE TRIGGER journal_entries_immutable BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION vela_forbid_mutation();

-- 2) Double-entry balance: every journal entry must have Σdebits = Σcredits.
-- Deferred to commit so all lines of an entry are present when the check runs.
CREATE OR REPLACE FUNCTION vela_assert_journal_balanced() RETURNS trigger AS $$
DECLARE d numeric(14,4); c numeric(14,4);
BEGIN
  SELECT COALESCE(sum(debit), 0), COALESCE(sum(credit), 0)
    INTO d, c
    FROM journal_lines
   WHERE journal_entry_id = NEW.journal_entry_id;
  IF d <> c THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced: debits=% credits=% (doc 04 §2).', NEW.journal_entry_id, d, c
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_lines_balanced ON journal_lines;
CREATE CONSTRAINT TRIGGER journal_lines_balanced
  AFTER INSERT ON journal_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION vela_assert_journal_balanced();
