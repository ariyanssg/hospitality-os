/* The Desk — Concept · views: Today (landing) + Arrivals board. */
(function () {
  const { Badge, Avatar, MoneyText, StatTile, ReservationStatusBadge } = window.AtriumVelaDesignSystem_ec9d90;
  const { Icon } = window.FD_Shell;
  const { useState, useMemo } = React;

  const FACETS = [
    ['room', 'Room assigned'], ['inspected', 'Room inspected'], ['paid', 'Payment verified'],
    ['regcard', 'Reg card done'], ['key', 'Key ready'],
  ];
  const score = (a) => FACETS.reduce((n, [k]) => n + (a[k] ? 1 : 0), 0);

  /* Composite readiness chip — the exception-first signal. */
  function ReadyChip({ a }) {
    const s = score(a);
    const title = FACETS.map(([k, label]) => (a[k] ? '✓ ' : '· ') + label).join('\n');
    return (
      <span className={'fd-ready' + (s === 5 ? ' is-full' : '')} title={title}>
        {FACETS.map(([k]) => <span key={k} className={'fd-ready__dot' + (a[k] ? ' is-on' : '')} />)}
        <span className="fd-ready__score">{s}/5</span>
      </span>
    );
  }

  const CH_LABEL = { direct: 'Direct', ota: 'OTA', corporate: 'Corp', group: 'Group', walkin: 'Walk-in' };
  function ChannelDot({ ch, label = true }) {
    return (
      <span className="fd-channel">
        <span className="fd-channel__dot" style={{ background: `var(--channel-${ch})` }} />
        {label && CH_LABEL[ch]}
      </span>
    );
  }

  /* ── Today ───────────────────────────────────────────────────────── */
  function TodayView({ me, arrivals, ai, channels, aiOn, onOpen, onRoute, onAssign, onAct }) {
    const unassigned = arrivals.filter((a) => !a.room);
    const unpaid = arrivals.filter((a) => a.room && !a.paid);
    const ready = arrivals.filter((a) => score(a) === 5).length;
    const vips = arrivals.filter((a) => a.vip);
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return (
      <div className="fd-page" style={{ maxWidth: 980, margin: '0 auto' }}>
        <div className="fd-page__head">
          <div>
            <h1 className="fd-h1">{greet}, {me.name.split(' ')[0]}</h1>
            <p className="fd-sub">{arrivals.length} arrivals on the book · {ready} fully ready — work the exceptions first.</p>
          </div>
          <Badge tone="positive" dot>Cashier session open</Badge>
        </div>

        <div className="fd-tilegrid">
          <StatTile label="Occupancy" value="84%" delta={{ dir: 'up', value: '4%' }} sub="62 of 74 rooms" />
          <StatTile label="Arrivals" value={arrivals.length} sub={`${arrivals.length - unassigned.length} assigned · ${unassigned.length} to place`} />
          <StatTile label="Departures" value={5} sub="2 due before noon" />
          <StatTile label="ADR" value="$241" delta={{ dir: 'up', value: '4%' }} sub="vs. same day last week" />
        </div>

        <section className="fd-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="circle-alert" size={16} style={{ color: 'var(--status-caution-ink)' }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Needs attention</h2>
            <Badge tone="caution">{unassigned.length + unpaid.length + 1}</Badge>
          </div>
          <ul className="fd-attn">
            {unassigned.map((a) => (
              <li key={a.id} className="fd-attn__row" onClick={() => onOpen(a.id)}>
                <span className="fd-attn__icon" style={{ background: 'var(--status-caution-bg)', color: 'var(--status-caution-ink)' }}>
                  <Icon name="bed-double" size={15} />
                </span>
                <span>
                  <span className="fd-attn__title">{a.last}, {a.first} arrives {a.eta} — no room assigned</span>
                  <span className="fd-attn__meta" style={{ display: 'block' }}>{a.roomType} · {a.nights}N · <span className="font-mono">{a.conf}</span></span>
                </span>
                <span className="fd-attn__act">
                  <button className="fd-chip" onClick={(e) => { e.stopPropagation(); onAssign(a.id); }}>
                    <Icon name="wand-sparkles" size={13} /> Assign
                  </button>
                </span>
              </li>
            ))}
            {unpaid.map((a) => (
              <li key={a.id} className="fd-attn__row" onClick={() => onOpen(a.id)}>
                <span className="fd-attn__icon" style={{ background: 'var(--status-critical-bg)', color: 'var(--status-critical-ink)' }}>
                  <Icon name="credit-card" size={15} />
                </span>
                <span>
                  <span className="fd-attn__title">Payment not verified — {a.last}, {a.first}</span>
                  <span className="fd-attn__meta" style={{ display: 'block' }}>Card on file declined pre-auth · balance <MoneyText amount={a.balance} /></span>
                </span>
                <span className="fd-attn__act" style={{ display: 'inline-flex', gap: 6 }}>
                  <button className="fd-chip" onClick={(e) => { e.stopPropagation(); onAct({ icon: 'link', tone: 'info', text: 'Pay-by-link sent to ' + a.first + ' — expires in 24h' }); }}>
                    <Icon name="link" size={13} /> Pay link
                  </button>
                  <button className="fd-chip" onClick={(e) => { e.stopPropagation(); onAct({ icon: 'rotate-ccw', text: 'Pre-auth retried — approved' }); }}>
                    <Icon name="rotate-ccw" size={13} /> Retry
                  </button>
                </span>
              </li>
            ))}
            <li className="fd-attn__row">
              <span className="fd-attn__icon" style={{ background: 'var(--status-info-bg)', color: 'var(--status-info-ink)' }}>
                <Icon name="timer" size={15} />
              </span>
              <span>
                <span className="fd-attn__title">Hold on 520 expires 17:00 — Tanaka (tentative)</span>
                <span className="fd-attn__meta" style={{ display: 'block' }}>Deluxe Suite · 2N · deposit link sent, unpaid</span>
              </span>
              <span className="fd-attn__act"><button className="fd-chip"><Icon name="send" size={13} /> Re-send link</button></span>
            </li>
          </ul>
        </section>

        {aiOn && (
          <section className="fd-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="sparkles" size={16} style={{ color: 'var(--ink-accent)' }} />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Vela AI</h2>
              <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>assistive · approve-before-publish · every action audited</span>
            </div>
            <div className="fd-aigrid">
              {ai.map((s) => (
                <div key={s.id} className="fd-ai">
                  <div className="fd-ai__head">
                    <Icon name={s.icon} size={15} style={{ color: 'var(--ink-accent)' }} />
                    <b>{s.title}</b>
                    <span className="fd-ai__conf font-mono">{s.confidence}</span>
                  </div>
                  <p className="fd-ai__body">{s.body}</p>
                  <div className="fd-ai__acts">
                    {s.actions.map((label, i) => (
                      <button key={label} className="fd-chip" style={i === 0 ? { color: 'var(--ink-accent)', fontWeight: 500 } : undefined}
                        onClick={() => onAct({ icon: 'sparkles', tone: 'info', text: s.kind === 'pricing' ? 'Rate change published — channels sync <60s · audited' : label + ' — queued', undo: s.kind === 'pricing' })}>
                        {label}
                      </button>
                    ))}
                    <button className="fd-ai__dismiss" onClick={() => onAct({ icon: 'x', text: 'Dismissed — feedback recorded' })}>Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <section className="fd-panel">
            <h3 className="fd-sec">VIP arrivals</h3>
            <div className="fd-vipstrip">
              {vips.map((a) => (
                <button key={a.id} className="fd-vip" onClick={() => onOpen(a.id)}>
                  <Avatar name={a.first + ' ' + a.last} size="sm" />
                  {a.first} {a.last}
                  <span className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>{a.eta}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="fd-panel">
            <h3 className="fd-sec">Shift handover</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--ink-secondary)' }}>
              Marino (518) — champagne on arrival, billing to corporate master. 304 out of order through
              Friday, plumbing. One comp posted last shift (folio F-0992, manager-approved).
            </p>
          </section>
          <section className="fd-panel" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h3 className="fd-sec" style={{ margin: 0 }}>Distribution health</h3>
              <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>same availability counters the desk writes — zero sync lag by construction</span>
            </div>
            <div className="fd-chgrid">
              {channels.map((c) => (
                <div key={c.name} className="fd-chhealth">
                  <span className="fd-chhealth__dot" style={{ background: c.ok ? 'var(--status-positive-ink)' : 'var(--status-caution-ink)' }} />
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: c.ok ? 'var(--ink-tertiary)' : 'var(--status-caution-ink)' }}>{c.note}</span>
                  </span>
                  <span className="font-mono" style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>{c.lag}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <button className="fd-chip" style={{ alignSelf: 'flex-start' }} onClick={() => onRoute('arrivals')}>
          Open arrivals board <Icon name="arrow-right" size={13} />
        </button>
      </div>
    );
  }

  /* ── Arrivals board ──────────────────────────────────────────────── */
  const VIEWS = ['All', 'Unassigned', 'VIP', 'In queue'];
  function ArrivalsView({ arrivals, newIds, selected, onSelect, checked, onCheck, onOpen }) {
    const [view, setView] = useState('All');
    const rows = useMemo(() => {
      let r = arrivals;
      if (view === 'Unassigned') r = r.filter((a) => !a.room);
      else if (view === 'VIP') r = r.filter((a) => a.vip);
      else if (view === 'In queue') r = r.filter((a) => a.room && !a.inspected);
      return [...r].sort((x, y) => score(x) - score(y) || x.eta.localeCompare(y.eta));
    }, [arrivals, view]);
    const unassigned = arrivals.filter((a) => !a.room).length;
    const allChecked = rows.length > 0 && rows.every((a) => checked.has(a.id));
    return (
      <div className="fd-page">
        <div className="fd-page__head">
          <div>
            <h1 className="fd-h1">Arrivals</h1>
            <p className="fd-sub">Sorted by readiness — exceptions float to the top. <Icon name="smartphone" size={11} /> = guest self check-in underway. <Icon name="corner-down-left" size={11} /> starts check-in.</p>
          </div>
          <div className="fd-segs">
            {VIEWS.map((v) => (
              <button key={v} className={'fd-seg' + (view === v ? ' is-active' : '')} onClick={() => setView(v)}>
                {v}{v === 'Unassigned' && unassigned > 0 && <Badge tone="caution">{unassigned}</Badge>}
              </button>
            ))}
          </div>
        </div>

        <div className="fd-board">
          <table className="fd-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input type="checkbox" className="fd-check" checked={allChecked} aria-label="Select all"
                    onChange={() => onCheck(allChecked ? [] : rows.map((a) => a.id), true)} />
                </th>
                <th>ETA</th><th>Guest</th><th>Channel</th><th>Stay</th><th>Readiness</th><th>Status</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} tabIndex={0}
                  className={'fd-row' + (selected === a.id ? ' is-selected' : '') + (newIds.has(a.id) ? ' is-new' : '')}
                  onClick={() => onOpen(a.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onOpen(a.id); }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="fd-check" checked={checked.has(a.id)} aria-label={'Select ' + a.last}
                      onChange={() => onCheck([a.id])} />
                  </td>
                  <td className="fd-eta">{a.eta}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>{a.last}, {a.first}</span>
                      {a.vip && <Badge tone="accent">VIP</Badge>}
                      {a.online && (
                        <span title={a.online === 'done' ? 'Online check-in complete — ID uploaded, reg card e-signed' : 'Online check-in started on guest’s phone'}
                          style={{ display: 'inline-flex', color: a.online === 'done' ? 'var(--status-positive-ink)' : 'var(--status-caution-ink)' }}>
                          <Icon name="smartphone" size={13} />
                        </span>
                      )}
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{a.conf}</span>
                    </span>
                  </td>
                  <td><ChannelDot ch={a.channel} /></td>
                  <td className="font-mono" style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                    {a.nights}N · {a.rt}{a.room ? ' · ' + a.room : ''}
                  </td>
                  <td><ReadyChip a={a} /></td>
                  <td><ReservationStatusBadge status={a.status} /></td>
                  <td style={{ textAlign: 'right' }}><MoneyText amount={a.balance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  window.FD_Views = { TodayView, ArrivalsView, ReadyChip, ChannelDot, score };
})();
