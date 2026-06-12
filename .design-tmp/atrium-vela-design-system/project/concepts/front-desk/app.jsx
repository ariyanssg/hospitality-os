/* The Desk — Concept · root app: tweakable layout/theme/accent, routing, live events. */
(function () {
  const DS = window.AtriumVelaDesignSystem_ec9d90;
  const SH = window.FD_Shell;
  const { TodayView, ArrivalsView } = window.FD_Views;
  const { RackView } = window.FD_Rack;
  const { CheckinDrawer } = window.FD_Checkin;
  const OPS = window.FD_Ops;
  const D = window.FD_DATA;
  const R = React;
  const Ic = SH.Icon;

  /* ── Tweaks ──────────────────────────────────────────────────────── */
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "layout": "navbar",
    "dark": false,
    "density": "comfortable",
    "accent": "#2C6FD6",
    "barShape": "pill",
    "liveEvents": true,
    "aiPanel": true
  }/*EDITMODE-END*/;

  /* Curated accents — one confident hue at a time (color usage law). */
  const ACCENTS = {
    '#2C6FD6': { name: 'Azure', h: 251, cMul: 1 },
    '#7A5AE0': { name: 'Violet', h: 290, cMul: 1.05 },
    '#0F8A96': { name: 'Lagoon', h: 200, cMul: 0.85 },
    '#4A5160': { name: 'Ink', h: 260, cMul: 0.16 },
  };
  const RAMP = [[50, 97, .02], [100, 93, .04], [200, 87, .07], [300, 79, .10], [400, 70, .13],
    [500, 62, .155], [600, 55, .16], [700, 48, .15], [800, 40, .12], [900, 33, .09], [950, 25, .06]];
  function applyAccent(hex) {
    const a = ACCENTS[hex] || ACCENTS['#2C6FD6'];
    const vars = RAMP.map(([s, l, c]) => `--accent-${s}: oklch(${l}% ${(c * a.cMul).toFixed(3)} ${a.h});`).join('\n');
    let el = document.getElementById('fd-accent');
    if (!el) { el = document.createElement('style'); el.id = 'fd-accent'; document.head.appendChild(el); }
    el.textContent = `:root {\n${vars}\n}`;
  }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [route, setRoute] = R.useState('today');
    const [property, setProperty] = R.useState(D.properties[0]);
    const [kOpen, setKOpen] = R.useState(false);
    const [arrivals, setArrivals] = R.useState(D.arrivals);
    const [stays, setStays] = R.useState(D.stays);
    const [hk, setHk] = R.useState(D.hkQueue);
    const [bumped, setBumped] = R.useState(new Set());
    const [depDone, setDepDone] = R.useState(new Set());
    const [depOpen, setDepOpen] = R.useState(null);
    const [checked, setChecked] = R.useState(new Set());
    const [newIds, setNewIds] = R.useState(new Set());
    const [openId, setOpenId] = R.useState(null);
    const [toast, setToast] = R.useState(null);
    const toastTimer = R.useRef(null);

    R.useEffect(() => { document.documentElement.classList.toggle('dark', !!t.dark); }, [t.dark]);
    R.useEffect(() => { applyAccent(t.accent); }, [t.accent]);

    /* ⌘K global */
    R.useEffect(() => {
      const onKey = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setKOpen((o) => !o); }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, []);

    const showToast = (tt) => {
      setToast(tt);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4200);
    };

    /* Live events — the zero-refresh thesis made visible (tweakable). */
    R.useEffect(() => {
      if (!t.liveEvents) return;
      const t1 = setTimeout(() => {
        setArrivals((list) => list.some((a) => a.id === D.liveBooking.id) ? list : [...list, D.liveBooking]);
        setNewIds(new Set([D.liveBooking.id]));
        showToast({ icon: 'zap', tone: 'info', text: 'New booking — Booking.com · Hoffmann, King Ocean View, 2N' });
        setTimeout(() => setNewIds(new Set()), 2200);
      }, 9000);
      const t2 = setTimeout(() => {
        showToast({ icon: 'utensils', tone: 'info', text: 'POS — dinner ($112.40) posted to folio · room 405, mid-meal' });
      }, 21000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [t.liveEvents]);

    const toggleCheck = (ids, replace) => {
      setChecked((prev) => {
        if (replace) return new Set(ids);
        const next = new Set(prev);
        ids.forEach((id) => next.has(id) ? next.delete(id) : next.add(id));
        return next;
      });
    };

    const autoAssign = (ids) => {
      const pool = ['415', '201', '512', '202'];
      let i = 0;
      setArrivals((list) => list.map((a) =>
        ids.includes(a.id) && !a.room ? { ...a, room: pool[i++ % pool.length], inspected: true } : a));
      setChecked(new Set());
      showToast({ icon: 'wand-sparkles', text: 'Rooms assigned — gap-optimized, preferences matched', undo: true });
    };

    const completeCheckin = (id, room) => {
      setArrivals((list) => list.map((a) =>
        a.id === id ? { ...a, status: 'checked_in', room, inspected: true, paid: true, regcard: true, key: true, balance: '0.00' } : a));
      const res = arrivals.find((a) => a.id === id);
      if (res) {
        setStays((s) => s.map((st) =>
          st.guest === res.last && st.kind === 'arrival' ? { ...st, kind: 'inhouse', room } : st));
      }
      setOpenId(null);
      showToast({ icon: 'log-in', text: (res ? res.first + ' ' + res.last : 'Guest') + ' checked in — room ' + room, undo: true });
    };

    /* Queue-room loop: bump → attendant pinged → room flips inspected → desk + guest notified. */
    const bumpRoom = (room) => {
      setBumped((prev) => new Set([...prev, room]));
      showToast({ icon: 'bell-ring', tone: 'info', text: 'Room ' + room + ' bumped — attendant\u2019s phone pinged' });
      setTimeout(() => {
        setHk((list) => list.map((h) => h.room === room ? { ...h, state: 'inspected', eta: 'done' } : h));
        showToast({ icon: 'circle-check', text: 'Room ' + room + ' inspected — desk notified · guest SMS sent' });
      }, 6000);
    };

    const completeCheckout = (id) => {
      setDepDone((prev) => new Set([...prev, id]));
      setDepOpen(null);
      const d = D.departures.find((x) => x.id === id);
      showToast({ icon: 'door-open', text: (d ? d.last : 'Guest') + ' departed — invoice emailed, room ' + (d ? d.room : '') + ' to housekeeping', undo: true });
    };

    const openRes = arrivals.find((a) => a.id === openId);
    const onStayClick = (stay) => {
      const match = arrivals.find((a) => a.last === stay.guest && a.status === 'confirmed');
      if (match) setOpenId(match.id);
    };

    /* Pulse vitals */
    const total = arrivals.length;
    const placed = arrivals.filter((a) => a.room).length;
    const inHouse = arrivals.filter((a) => a.status === 'checked_in').length;
    const pulse = [
      { id: 'occ', label: 'Occupancy', value: (84 + inHouse) + '%', delta: { dir: 'up', value: '4%' }, tone: 'info' },
      { id: 'arr', label: 'Arrivals', value: total - inHouse, progress: total ? (placed + inHouse) / total : 0, onClick: () => setRoute('arrivals') },
      { id: 'queue', label: 'Unassigned', value: total - placed, tone: total - placed > 0 ? 'caution' : 'positive' },
      { id: 'dep', label: 'Departures', value: D.departures.length - depDone.size, progress: depDone.size / D.departures.length, onClick: () => setRoute('departures') },
      { id: 'hk', label: 'HK to inspect', value: Math.max(0, 9 - bumped.size), tone: 'caution', onClick: () => setRoute('housekeeping') },
      { id: 'sync', label: 'Channel sync', value: '<5s', tone: 'positive' },
      { id: 'adr', label: 'ADR', value: '$241', delta: { dir: 'up', value: '4%' }, tone: 'positive' },
      { id: 'alerts', label: 'Alerts', value: 2, tone: 'critical' },
    ];

    const kItems = [
      { id: 'n1', group: 'Navigate', label: 'Today', icon: 'layout-grid', hint: 'g t', run: () => setRoute('today') },
      { id: 'n2', group: 'Navigate', label: 'Arrivals board', icon: 'calendar-check', hint: 'g a', run: () => setRoute('arrivals') },
      { id: 'n3', group: 'Navigate', label: 'Rack', icon: 'bed-double', hint: 'g r', run: () => setRoute('rack') },
      { id: 'n4', group: 'Navigate', label: 'Departures', icon: 'door-open', run: () => setRoute('departures') },
      { id: 'n5', group: 'Navigate', label: 'Housekeeping', icon: 'sparkles', run: () => setRoute('housekeeping') },
      { id: 'n6', group: 'Navigate', label: 'Night audit', icon: 'moon-star', run: () => setRoute('audit') },
      ...arrivals.filter((a) => a.status === 'confirmed').slice(0, 4).map((a) => ({
        id: 'g-' + a.id, group: 'Guests', label: 'Check in ' + a.first + ' ' + a.last, icon: 'user-check', hint: a.conf,
        run: () => { setRoute('arrivals'); setOpenId(a.id); },
      })),
      { id: 'ai1', group: 'Ask Vela', label: '“show occupancy last 12 months” — renders the chart inline', icon: 'sparkles', run: () => {} },
      { id: 'a1', group: 'Actions', label: 'New reservation', icon: 'circle-plus', run: () => {} },
      { id: 'a2', group: 'Actions', label: 'Switch to ' + (t.dark ? 'light' : 'dark') + ' mode', icon: t.dark ? 'sun' : 'moon', run: () => setTweak('dark', !t.dark) },
    ];

    const badges = { arrivals: total - placed, departures: D.departures.length - depDone.size };
    const navbar = t.layout !== 'sidebar';

    return (
      <div className="fd-shell" data-barshape={t.barShape} data-density={t.density === 'comfortable' ? undefined : t.density}>
        <SH.TopBar me={D.me} property={property} properties={D.properties} onProperty={setProperty}
          theme={t.dark ? 'dark' : 'light'} onToggleTheme={() => setTweak('dark', !t.dark)}
          density={t.density} onDensity={() => setTweak('density', t.density === 'comfortable' ? 'compact' : t.density === 'compact' ? 'touch' : 'comfortable')}
          onOpenK={() => setKOpen(true)} />
        {navbar && <SH.NavTabs route={route} onRoute={(r) => { setRoute(r); setChecked(new Set()); }} badges={badges} />}
        <div className="fd-body">
          {!navbar && <SH.Rail route={route} onRoute={(r) => { setRoute(r); setChecked(new Set()); }} />}
          <main className="fd-main">
            <DS.PulseBar chips={pulse} />
            <div className="fd-scroll">
              {route === 'today' && (
                <TodayView me={D.me} arrivals={arrivals.filter((a) => a.status === 'confirmed')}
                  ai={D.aiSuggestions} channels={D.channels} aiOn={!!t.aiPanel}
                  onOpen={setOpenId} onRoute={setRoute} onAssign={(id) => autoAssign([id])} onAct={showToast} />
              )}
              {route === 'arrivals' && (
                <ArrivalsView arrivals={arrivals} newIds={newIds} selected={openId}
                  checked={checked} onCheck={toggleCheck} onOpen={setOpenId} />
              )}
              {route === 'rack' && (
                <RackView days={D.days} rooms={D.rooms} stays={stays} ooo={D.ooo} onStayClick={onStayClick} />
              )}
              {route === 'departures' && (
                <OPS.DeparturesView departures={D.departures} done={depDone} onOpen={setDepOpen} />
              )}
              {route === 'inhouse' && <OPS.InHouseView arrivals={arrivals} onToast={showToast} />}
              {route === 'housekeeping' && <OPS.HousekeepingView hkQueue={hk} bumped={bumped} onBump={bumpRoom} />}
              {route === 'audit' && <OPS.NightAuditView items={D.nightAudit} />}
              {route === 'folios' && (
                <div style={{ maxWidth: 460, margin: '90px auto', textAlign: 'center', color: 'var(--ink-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Ic name="receipt" size={26} />
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                    Folio ledgers live on each reservation — open any guest from <b style={{ color: 'var(--ink-secondary)' }}>Arrivals</b>,{' '}
                    <b style={{ color: 'var(--ink-secondary)' }}>In-house</b> or <b style={{ color: 'var(--ink-secondary)' }}>Departures</b> to see the running balance, postings and settlement.
                  </p>
                  <DS.Button variant="secondary" size="sm" onClick={() => setRoute('inhouse')}>Open In-house</DS.Button>
                </div>
              )}
            </div>
          </main>
        </div>

        <SH.ActionTray count={checked.size} onClear={() => setChecked(new Set())}
          onAssign={() => autoAssign([...checked])}
          onPrereg={() => { setChecked(new Set()); showToast({ icon: 'clipboard-check', text: 'Pre-registration links sent', undo: true }); }} />
        <CheckinDrawer res={openRes && openRes.status === 'confirmed' ? openRes : null}
          suggestions={openRes ? D.roomSuggestions[openRes.rt] : []}
          upsell={D.upsell} onClose={() => setOpenId(null)} onComplete={completeCheckin} />
        <OPS.CheckoutDrawer dep={D.departures.find((d) => d.id === depOpen) || null}
          onClose={() => setDepOpen(null)} onComplete={completeCheckout} />
        <SH.CommandPalette open={kOpen} onClose={() => setKOpen(false)} items={kItems} />
        <SH.Toast toast={toast} onUndo={() => setToast(null)} />

        <TweaksPanel>
          <TweakSection label="Layout" />
          <TweakRadio label="Navigation" value={t.layout} options={['navbar', 'sidebar']}
            onChange={(v) => setTweak('layout', v)} />
          <TweakRadio label="Density" value={t.density} options={['comfortable', 'compact', 'touch']}
            onChange={(v) => setTweak('density', v)} />
          <TweakSection label="Theme" />
          <TweakColor label="Accent" value={t.accent} options={Object.keys(ACCENTS)}
            onChange={(v) => setTweak('accent', v)} />
          <TweakToggle label="Dark mode" value={!!t.dark} onChange={(v) => setTweak('dark', v)} />
          <TweakSection label="Rack" />
          <TweakRadio label="Stay bars" value={t.barShape} options={['pill', 'soft']}
            onChange={(v) => setTweak('barShape', v)} />
          <TweakSection label="Demo" />
          <TweakToggle label="Live events" value={!!t.liveEvents} onChange={(v) => setTweak('liveEvents', v)} />
          <TweakToggle label="AI suggestions" value={!!t.aiPanel} onChange={(v) => setTweak('aiPanel', v)} />
        </TweaksPanel>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
