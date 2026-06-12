/* The Desk — screens: Login, Today, Arrivals, ReservationDrawer body. */
const { Button: B, Input: I, Badge: Bd, MoneyText: M, PulseBar: PB, StatTile: ST,
  RoomStatusChip: RSC, ReservationStatusBadge: RSB, GuestCard: GC, Avatar: Av, Skeleton: Sk } =
  window.AtriumVelaDesignSystem_ec9d90;
const { Icon: Ic } = window.DeskShell;
const { useState: uS } = React;

/* ── Login ───────────────────────────────────────────────────────────────── */
function LoginScreen({ onSignIn }) {
  const [email, setEmail] = uS('frankie@grand-vela.demo');
  const [password, setPassword] = uS('demo-password');
  const [loading, setLoading] = uS(false);
  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onSignIn(); }, 650);
  };
  return (
    <main className="desk-login">
      <div className="desk-login__card-wrap">
        <div className="desk-login__brand">
          <img src="../../assets/vela-mark.svg" width="44" height="44" alt="" />
          <h1 className="font-display" style={{ margin: '14px 0 2px', fontSize: 24, fontWeight: 600 }}>The Desk</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)' }}>Sign in to Vela — calm surface, deep machine.</p>
        </div>
        <form className="desk-login__card" onSubmit={submit}>
          <label className="desk-field">
            <span>Email</span>
            <I type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label className="desk-field">
            <span>Password</span>
            <I type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <B type="submit" loading={loading} style={{ width: '100%' }}>Sign in</B>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--ink-tertiary)' }}>
          Demo property · Grand Vela — Ocean Club
        </p>
      </div>
    </main>
  );
}

/* ── Today ───────────────────────────────────────────────────────────────── */
function TodayView({ me, arrivals, onOpen, onRoute }) {
  const unassigned = arrivals.filter((a) => !a.assigned);
  const assigned = arrivals.length - unassigned.length;
  return (
    <div className="desk-page" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Good day, {me.name.split(' ')[0]}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-tertiary)' }}>
          {arrivals.length} arrivals remaining — work the exceptions first.
        </p>
      </div>

      <div className="desk-tilegrid">
        <ST label="Occupancy" value="84%" delta={{ dir: 'up', value: '4%' }} sub="vs. yesterday" />
        <ST label="Arrivals" value={arrivals.length} sub={`${assigned} of ${arrivals.length} ready`} />
        <ST label="Departures" value={5} sub="2 due now" />
        <ST label="ADR" value="$241" delta={{ dir: 'up', value: '4%' }} />
      </div>

      <section className="desk-panel">
        <div className="desk-panel__head">
          <Ic name="circle-alert" size={16} style={{ color: 'var(--status-caution-ink)' }} />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Needs attention</h2>
          <Bd tone="caution">{unassigned.length}</Bd>
        </div>
        {unassigned.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', margin: 0 }}>
            All clear — every arrival has a room. Next at 15:40 (Nakamura, DLX).
          </p>
        ) : (
          <ul className="desk-attn">
            {unassigned.map((a) => (
              <li key={a.id} className="desk-attn__row" onClick={() => onOpen(a.id)}>
                <span className="desk-attn__name">
                  <Ic name="bed-double" size={16} style={{ color: 'var(--ink-tertiary)' }} />
                  <span style={{ fontWeight: 500 }}>{a.last}, {a.first}</span>
                  {a.vip && <Bd tone="accent">VIP</Bd>}
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{a.conf}</span>
                </span>
                <span className="desk-attn__flag">
                  <Ic name="clock" size={14} /> Unassigned
                </span>
              </li>
            ))}
          </ul>
        )}
        <button className="desk-link" onClick={() => onRoute('arrivals')}>
          Open arrivals board <Ic name="arrow-right" size={14} />
        </button>
      </section>
    </div>
  );
}

/* ── Arrivals board ──────────────────────────────────────────────────────── */
const VIEWS = ['All', 'Unassigned', 'VIP', 'In queue'];
function ArrivalsView({ arrivals, onOpen, selectedId }) {
  const [view, setView] = uS('All');
  let rows = arrivals;
  if (view === 'Unassigned') rows = arrivals.filter((a) => !a.assigned);
  else if (view === 'VIP') rows = arrivals.filter((a) => a.vip);
  else if (view === 'In queue') rows = arrivals.filter((a) => !a.inspected);
  const unassignedCount = arrivals.filter((a) => !a.assigned).length;

  return (
    <div className="desk-page">
      <div className="desk-page__head">
        <div>
          <h1 className="font-display" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Arrivals</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-tertiary)' }}>
            Work the exceptions, not the list — sort by readiness.
          </p>
        </div>
        <div className="desk-segs">
          {VIEWS.map((v) => (
            <button key={v} className={'desk-seg' + (view === v ? ' is-active' : '')} onClick={() => setView(v)}>
              {v}
              {v === 'Unassigned' && <Bd tone="caution" style={{ marginLeft: 6 }}>{unassignedCount}</Bd>}
            </button>
          ))}
        </div>
      </div>

      <div className="desk-grid">
        <table className="desk-table">
          <thead>
            <tr>
              <th>Conf.</th><th>Guest</th><th>Stay</th><th>Pax</th><th>Readiness</th><th>Status</th><th style={{ textAlign: 'right' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className={'desk-row' + (selectedId === a.id ? ' is-selected' : '')} tabIndex={0}
                onClick={() => onOpen(a.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpen(a.id); }}>
                <td className="font-mono" style={{ color: 'var(--ink-secondary)' }}>{a.conf}</td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{a.last}, {a.first}</span>
                    {a.vip && <Bd tone="accent">VIP</Bd>}
                  </span>
                </td>
                <td className="font-mono" style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{a.nights}N · {a.rt}</td>
                <td className="tnum" style={{ color: 'var(--ink-secondary)' }}>{a.adults}+{a.children}</td>
                <td>
                  {a.assigned ? (
                    <span className="desk-ready is-ok"><Ic name="circle-check" size={15} /> Room {a.assigned}</span>
                  ) : (
                    <span className="desk-ready"><Ic name="circle" size={15} /> Unassigned</span>
                  )}
                </td>
                <td><RSB status={a.status} /></td>
                <td style={{ textAlign: 'right' }}><M amount={a.balance} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Reservation drawer body ─────────────────────────────────────────────── */
function ReservationBody({ res, checkedIn }) {
  const nightly = window.DESK_DATA.nightlyByRt[res.rt];
  const nights = Array.from({ length: res.nights }, (_, i) => i);
  const postings = [
    { id: 'p1', desc: 'Room Charge — ' + res.roomType, date: 'business date', amount: nightly },
    ...(res.paid ? [{ id: 'p2', desc: 'Payment — Visa ••42', date: 'on file', amount: '-' + nightly }] : []),
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <GC name={res.first + ' ' + res.last} vip={res.vip}
        summary={res.roomType + ' · ' + res.nights + ' night' + (res.nights > 1 ? 's' : '') + ' · ' + res.conf}
        traits={res.traits} ltv={(Number(res.total) * 7).toFixed(2)} />

      <section>
        <h3 className="desk-sec">Readiness</h3>
        <div className="desk-readgrid">
          <ReadFlag ok={!!res.assigned} label={res.assigned ? 'Room ' + res.assigned : 'Room'} />
          <ReadFlag ok={res.inspected} label="Inspected" />
          <ReadFlag ok={res.paid} label="Payment" />
          <ReadFlag ok={true} label="Reg card" />
        </div>
      </section>

      <section>
        <h3 className="desk-sec">Stay</h3>
        <div className="desk-ledger">
          {nights.map((n) => (
            <div key={n} className="desk-ledger__row">
              <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>Night {n + 1}</span>
              <M amount={nightly} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="desk-sec-row">
          <h3 className="desk-sec" style={{ margin: 0 }}>Folio F-1{res.id.slice(1)}0</h3>
          <Bd tone={checkedIn ? 'info' : 'neutral'}>{checkedIn ? 'open' : 'pending'}</Bd>
        </div>
        <div className="desk-ledger">
          {postings.map((p) => (
            <div key={p.id} className="desk-ledger__row">
              <div>
                <div style={{ fontSize: 13 }}>{p.desc}</div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{p.date}</div>
              </div>
              <M amount={p.amount} />
            </div>
          ))}
          <div className="desk-ledger__row desk-ledger__balance">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--ink-secondary)' }}>
              <Ic name="circle-check" size={14} /> Balance
            </span>
            <M amount={res.balance} />
          </div>
        </div>
      </section>
    </div>
  );
}
function ReadFlag({ ok, label }) {
  return (
    <span className={'desk-flag' + (ok ? ' is-ok' : '')}>
      <Ic name={ok ? 'circle-check' : 'circle'} size={15} /> {label}
    </span>
  );
}

window.DeskScreens = { LoginScreen, TodayView, ArrivalsView, ReservationBody };
