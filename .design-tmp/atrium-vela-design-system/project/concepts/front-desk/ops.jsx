/* The Desk — Concept · operational views: Departures (+ express checkout), In-house,
   Housekeeping room-ready queue, Night audit checklist. */
(function () {
  const { Badge, Button, Kbd, MoneyText, RoomStatusChip, Avatar } = window.AtriumVelaDesignSystem_ec9d90;
  const { Icon } = window.FD_Shell;
  const { useState, useEffect } = React;

  /* ── Departures board — readiness = folio balanced · no disputes · late flag ── */
  function depState(d) {
    if (d.dispute) return { tone: 'critical', label: 'Dispute open', icon: 'shield-alert' };
    if (Number(d.balance) > 0 && d.method.includes('Direct bill')) return { tone: 'info', label: 'AR transfer', icon: 'building-2' };
    if (Number(d.balance) > 0) return { tone: 'caution', label: 'Balance due', icon: 'credit-card' };
    return { tone: 'positive', label: 'Express ready', icon: 'circle-check' };
  }

  function DeparturesView({ departures, done, onOpen }) {
    return (
      <div className="fd-page">
        <div className="fd-page__head">
          <div>
            <h1 className="fd-h1">Departures</h1>
            <p className="fd-sub">Express path: <Kbd>↵</Kbd> → folio review → settle → emailed invoice. Exceptions route to the record with the blocker pre-focused.</p>
          </div>
          <Badge tone="neutral">{departures.length - done.size} remaining · {done.size} departed</Badge>
        </div>
        <div className="fd-board">
          <table className="fd-table">
            <thead>
              <tr><th>Due</th><th>Guest</th><th>Room</th><th>Settlement</th><th>Readiness</th><th style={{ textAlign: 'right' }}>Balance</th><th /></tr>
            </thead>
            <tbody>
              {departures.map((d) => {
                const s = depState(d);
                const out = done.has(d.id);
                return (
                  <tr key={d.id} tabIndex={0} className={'fd-row' + (out ? ' is-dim' : '')}
                    onClick={() => !out && onOpen(d.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !out) onOpen(d.id); }}>
                    <td className="fd-eta">{d.due}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 500 }}>{d.last}, {d.first}</span>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{d.conf}</span>
                      </span>
                      {d.late && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--status-info-ink)' }}>{d.late}</span>}
                    </td>
                    <td className="font-mono" style={{ fontSize: 12.5 }}>{d.room} <span style={{ color: 'var(--ink-tertiary)' }}>· {d.rt}</span></td>
                    <td style={{ fontSize: 12.5, color: 'var(--ink-secondary)', whiteSpace: 'normal', maxWidth: 260 }}>{d.method}</td>
                    <td>{out ? <Badge tone="neutral">Departed</Badge> : <Badge tone={s.tone} dot>{s.label}</Badge>}</td>
                    <td style={{ textAlign: 'right' }}><MoneyText amount={d.balance} /></td>
                    <td style={{ textAlign: 'right' }}>
                      {!out && Number(d.balance) === 0 && !d.dispute && (
                        <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>↵ express</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Express checkout drawer — three keystrokes ── */
  function CheckoutDrawer({ dep, onClose, onComplete }) {
    const [busy, setBusy] = useState(false);
    const [doneStep, setDoneStep] = useState(false);
    useEffect(() => { if (dep) { setBusy(false); setDoneStep(false); } }, [dep && dep.id]);
    useEffect(() => {
      if (!dep) return;
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    });
    if (!dep) return null;
    const lines = [
      { d: `Room ${dep.room} — ${dep.rt} × ${dep.nights}N`, a: (dep.rt === 'DLX' ? 420 : dep.rt === 'KING' ? 240 : 180) * dep.nights },
      { d: 'Occupancy tax (10%)', a: (dep.rt === 'DLX' ? 42 : dep.rt === 'KING' ? 24 : 18) * dep.nights },
    ];
    if (dep.late) lines.push({ d: 'Late checkout fee', a: 40 });
    if (Number(dep.balance) > 0 && !dep.method.includes('Direct bill')) lines.push({ d: 'Minibar — posted 07:40', a: Number(dep.balance) });
    const gross = lines.reduce((n, l) => n + l.a, 0);
    const settled = gross - Number(dep.balance);
    const settle = () => {
      setBusy(true);
      setTimeout(() => { setBusy(false); setDoneStep(true); }, 650);
    };
    return (
      <div className="fd-drawer" role="dialog" aria-modal="true" aria-label={'Check out ' + dep.last}>
        <button className="fd-scrim" tabIndex={-1} aria-label="Close" onClick={onClose} />
        <div className="fd-drawer__panel" style={{ width: 500 }}>
          <header className="fd-drawer__head">
            <div>
              <h2 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Check out — {dep.last}, {dep.first}</h2>
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{dep.conf} · room {dep.room} · due {dep.due}</span>
            </div>
            <button className="fd-iconbtn" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
          </header>
          <div className="fd-drawer__body">
            {doneStep ? (
              <div className="fd-done">
                <span className="fd-done__ring"><Icon name="check" size={30} /></span>
                <h3 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Departed — folio closed</h3>
                <div className="fd-done__list">
                  <span><Icon name="mail" size={14} style={{ color: 'var(--status-positive-ink)' }} /> Invoice emailed ({dep.first.toLowerCase()}@…)</span>
                  <span><Icon name="sparkles" size={14} style={{ color: 'var(--status-positive-ink)' }} /> Room {dep.room} queued for housekeeping</span>
                  <span><Icon name="lock" size={14} style={{ color: 'var(--status-positive-ink)' }} /> Postings immutable — reversal-only corrections</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {dep.dispute && (
                  <div className="fd-upsell" style={{ borderColor: 'var(--status-critical-line)', background: 'var(--status-critical-bg)', color: 'var(--status-critical-ink)' }}>
                    <Icon name="shield-alert" size={16} />
                    <span style={{ flex: 1 }}>Chargeback inquiry open — evidence pack (folio, reg card, signature) is assembled.</span>
                    <Button variant="secondary" size="sm">Open case</Button>
                  </div>
                )}
                <section>
                  <h3 className="fd-sec">Folio review</h3>
                  <div className="fd-ledger">
                    {lines.map((l, i) => (
                      <div key={i} className="fd-ledger__row">
                        <span style={{ fontSize: 13 }}>{l.d}</span>
                        <MoneyText amount={l.a.toFixed(2)} />
                      </div>
                    ))}
                    <div className="fd-ledger__row">
                      <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>Settled to date</span>
                      <MoneyText amount={(-settled).toFixed(2)} />
                    </div>
                    <div className="fd-ledger__row is-total">
                      <span style={{ fontSize: 13 }}>{dep.method.includes('Direct bill') ? 'Transfers to AR' : 'Balance'}</span>
                      <MoneyText amount={dep.balance} />
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="fd-sec">Settlement</h3>
                  <span className="fd-flag is-ok" style={{ width: '100%' }}>
                    <Icon name={dep.method.includes('Direct bill') ? 'building-2' : 'credit-card'} size={15} /> {dep.method}
                  </span>
                </section>
              </div>
            )}
          </div>
          <footer className="fd-drawer__foot">
            <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}><Kbd>esc</Kbd> closes — nothing is lost</span>
            <span style={{ flex: 1 }} />
            {doneStep ? (
              <Button onClick={() => onComplete(dep.id)}>Done</Button>
            ) : (
              <Button onClick={settle} loading={busy}>
                {Number(dep.balance) > 0 && !dep.method.includes('Direct bill') ? 'Collect & check out'
                  : dep.method.includes('Direct bill') ? 'Transfer to AR & check out' : 'Check out'}
                <Icon name="arrow-right" size={14} />
              </Button>
            )}
          </footer>
        </div>
      </div>
    );
  }

  /* ── In-house — folio-first list ── */
  function InHouseView({ arrivals, onOpen, onToast }) {
    const inhouse = [
      ...arrivals.filter((a) => a.status === 'checked_in').map((a) => ({
        id: a.id, name: a.last + ', ' + a.first, room: a.room, rt: a.rt, vip: a.vip,
        nights: a.nights, balance: (Number(a.rate) * 1).toFixed(2), note: 'Checked in today', live: true,
      })),
      { id: 'h1', name: 'Kowalski, Piotr', room: '206', rt: 'STD', nights: 4, balance: '792.00', note: 'Departs tomorrow · late checkout 14:00' },
      { id: 'h2', name: 'Fontaine, Margaux', room: '405', rt: 'KING', nights: 3, balance: '878.50', note: 'POS: dinner posted to folio 19:42' },
      { id: 'h3', name: 'Aldana, Camila', room: '511', rt: 'DLX', nights: 4, vip: true, balance: '0.00', note: 'Settled — departs 11:00' },
    ];
    return (
      <div className="fd-page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="fd-page__head">
          <div>
            <h1 className="fd-h1">In-house</h1>
            <p className="fd-sub">Running folios — a restaurant check posts here mid-meal, one ACID transaction away.</p>
          </div>
        </div>
        <div className="fd-board">
          <table className="fd-table">
            <thead><tr><th>Guest</th><th>Room</th><th>Folio note</th><th style={{ textAlign: 'right' }}>Balance</th><th /></tr></thead>
            <tbody>
              {inhouse.map((g) => (
                <tr key={g.id} className={'fd-row' + (g.live ? ' is-new' : '')}>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={g.name.replace(',', '')} size="sm" />
                      <span style={{ fontWeight: 500 }}>{g.name}</span>
                      {g.vip && <Badge tone="accent">VIP</Badge>}
                    </span>
                  </td>
                  <td className="font-mono" style={{ fontSize: 12.5 }}>{g.room} <span style={{ color: 'var(--ink-tertiary)' }}>· {g.rt}</span></td>
                  <td style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>{g.note}</td>
                  <td style={{ textAlign: 'right' }}><MoneyText amount={g.balance} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="fd-chip" onClick={() => onToast({ icon: 'receipt-text', text: 'Charge posted to ' + g.room + ' — Undo', undo: true })}>
                      <Icon name="receipt-text" size={13} /> Post charge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Housekeeping — room-ready queue, prioritized by imminent arrival ── */
  function HousekeepingView({ hkQueue, bumped, onBump }) {
    return (
      <div className="fd-page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <div className="fd-page__head">
          <div>
            <h1 className="fd-h1">Housekeeping</h1>
            <p className="fd-sub">Room-ready queue — bumping a room pings the attendant's phone; the desk gets a toast when it inspects.</p>
          </div>
          <Badge tone="caution">9 to inspect</Badge>
        </div>
        <div className="fd-board">
          <table className="fd-table">
            <thead><tr><th>Room</th><th>Status</th><th>Attendant</th><th>ETA</th><th>Next arrival</th><th /></tr></thead>
            <tbody>
              {hkQueue.map((h) => (
                <tr key={h.room} className="fd-row">
                  <td className="font-mono" style={{ fontWeight: 600 }}>{h.room} <span style={{ fontWeight: 400, color: 'var(--ink-tertiary)' }}>· {h.rt}</span></td>
                  <td><RoomStatusChip state={h.state} /></td>
                  <td style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>{h.assignee}</td>
                  <td className="font-mono" style={{ fontSize: 12 }}>{bumped.has(h.room) ? 'next up' : h.eta}</td>
                  <td style={{ fontSize: 12.5, color: h.priority ? 'var(--status-caution-ink)' : 'var(--ink-tertiary)' }}>
                    {h.priority && <Icon name="flame" size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />}{h.arrival}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {h.state === 'vacant-dirty' && (
                      bumped.has(h.room)
                        ? <Badge tone="info" dot>Bumped — attendant pinged</Badge>
                        : <button className="fd-chip" onClick={() => onBump(h.room)}><Icon name="bell-ring" size={13} /> Bump priority</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Night audit — the 90-second ritual ── */
  function NightAuditView({ items }) {
    const STATE = {
      done: { tone: 'positive', label: 'Clear', icon: 'circle-check' },
      ready: { tone: 'info', label: 'Ready', icon: 'circle-play' },
      blocked: { tone: 'caution', label: 'Action needed', icon: 'circle-alert' },
    };
    return (
      <div className="fd-page" style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="fd-page__head">
          <div>
            <h1 className="fd-h1">Night audit</h1>
            <p className="fd-sub">Business date rolls in one transaction — the trial balance ties to the desk by construction.</p>
          </div>
          <Badge tone="neutral">Business date · today</Badge>
        </div>
        <div className="fd-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {items.map((it, i) => {
            const s = STATE[it.state];
            return (
              <div key={it.id} className="fd-audit__row" style={{ borderTop: i ? '1px solid var(--line-hairline)' : 'none' }}>
                <Icon name={s.icon} size={17} style={{ color: `var(--status-${s.tone}-ink)` }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{it.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-tertiary)' }}>{it.detail}</span>
                </span>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>
            );
          })}
          <div className="fd-audit__row" style={{ borderTop: '1px solid var(--line-hairline)', background: 'var(--bg-raised)' }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--ink-tertiary)' }}>Audit runs unattended at 03:00 — this checklist exists for early closes.</span>
            <Button disabled title="Close the cashier session first">Run night audit</Button>
          </div>
        </div>
      </div>
    );
  }

  window.FD_Ops = { DeparturesView, CheckoutDrawer, InHouseView, HousekeepingView, NightAuditView };
})();
