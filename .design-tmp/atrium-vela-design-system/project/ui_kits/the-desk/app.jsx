/* The Desk — root app. Login → shell (Today / Arrivals) → reservation drawer + ⌘K. */
const { TopBar: TB, Rail: RL, CommandPalette: CP, Drawer: DW, refreshIcons: RI } = window.DeskShell;
const { LoginScreen: LS, TodayView: TV, ArrivalsView: AV, ReservationBody: RB } = window.DeskScreens;
const { Button: BTN, Badge: BDG } = window.AtriumVelaDesignSystem_ec9d90;
const RR = React;

function App() {
  const data = window.DESK_DATA;
  const [authed, setAuthed] = RR.useState(false);
  const [route, setRoute] = RR.useState('today');
  const [property, setProperty] = RR.useState(data.properties[0]);
  const [theme, setTheme] = RR.useState('light');
  const [kOpen, setKOpen] = RR.useState(false);
  const [selected, setSelected] = RR.useState(null);
  const [checkedIn, setCheckedIn] = RR.useState({});
  const [arrivals, setArrivals] = RR.useState(data.arrivals);
  const [busy, setBusy] = RR.useState(false);

  // Apply theme to the document.
  RR.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Global ⌘K / ⌘P. Refresh lucide icons after each render.
  RR.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setKOpen((o) => !o); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  RR.useLayoutEffect(() => { RI(); });

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const selectedRes = arrivals.find((a) => a.id === selected);

  const doCheckIn = () => {
    setBusy(true);
    setTimeout(() => {
      setCheckedIn((m) => ({ ...m, [selected]: true }));
      setArrivals((list) => list.map((a) => a.id === selected ? { ...a, status: 'checked_in', assigned: a.assigned || '418', inspected: true } : a));
      setBusy(false);
    }, 700);
  };

  const kItems = [
    { id: 'n-today', group: 'Navigate', label: 'Today', icon: 'layout-grid', hint: 'g t', run: () => setRoute('today') },
    { id: 'n-arr', group: 'Navigate', label: 'Arrivals board', icon: 'calendar-check', hint: 'g a', run: () => setRoute('arrivals') },
    { id: 'n-rack', group: 'Navigate', label: 'Rack', icon: 'bed-double', run: () => setRoute('rack') },
    ...arrivals.slice(0, 4).map((a) => ({
      id: 'e-' + a.id, group: 'Guests', label: 'Check in ' + a.first + ' ' + a.last, icon: 'user-check',
      hint: a.conf, run: () => { setRoute('arrivals'); setSelected(a.id); },
    })),
    { id: 'a-create', group: 'Actions', label: 'New reservation', icon: 'circle-plus', run: () => {} },
    { id: 'a-theme', group: 'Actions', label: 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode', icon: theme === 'dark' ? 'sun' : 'moon', run: toggleTheme },
    { id: 'a-signout', group: 'Session', label: 'Sign out', icon: 'log-out', run: () => setAuthed(false) },
  ];

  if (!authed) return <LS onSignIn={() => { setAuthed(true); setRoute('today'); }} />;

  const total = arrivals.length;
  const assigned = arrivals.filter((a) => a.assigned).length;
  const pulse = [
    { id: 'occ', label: 'Occupancy', value: '84%', delta: { dir: 'up', value: '4%' }, tone: 'info' },
    { id: 'arr', label: 'Arrivals', value: total, progress: assigned / total, onClick: () => setRoute('arrivals') },
    { id: 'queue', label: 'Unassigned', value: total - assigned, tone: total - assigned > 0 ? 'caution' : 'positive' },
    { id: 'dep', label: 'Departures', value: 5, progress: 0.4 },
    { id: 'hk', label: 'HK to inspect', value: 9, tone: 'caution' },
    { id: 'adr', label: 'ADR', value: '$241', delta: { dir: 'up', value: '4%' }, tone: 'positive' },
    { id: 'alerts', label: 'Alerts', value: 2, tone: 'critical' },
  ];
  const { PulseBar: PBC } = window.AtriumVelaDesignSystem_ec9d90;

  return (
    <div className="desk-shell">
      <TB me={data.me} property={property} properties={data.properties} onProperty={setProperty}
        theme={theme} onToggleTheme={toggleTheme} onOpenK={() => setKOpen(true)} onCreate={() => setRoute('arrivals')} />
      <div className="desk-body">
        <RL route={route} onRoute={setRoute} onSignOut={() => setAuthed(false)} />
        <main className="desk-main">
          <PBC chips={pulse} />
          <div className="desk-scroll">
            {route === 'today' && <TV me={data.me} arrivals={arrivals} onOpen={(id) => { setRoute('arrivals'); setSelected(id); }} onRoute={setRoute} />}
            {route === 'arrivals' && <AV arrivals={arrivals} onOpen={setSelected} selectedId={selected} />}
            {!['today', 'arrivals'].includes(route) && (
              <div className="desk-empty">
                <Ic name="hammer" />
                <p>The <b>{route}</b> board lives in the full product. This kit showcases Today, Arrivals & the check-in drawer.</p>
                <BTN variant="secondary" size="sm" onClick={() => setRoute('arrivals')}>Back to Arrivals</BTN>
              </div>
            )}
          </div>
        </main>
      </div>

      <DW
        open={!!selectedRes}
        onClose={() => setSelected(null)}
        width={560}
        title={selectedRes ? selectedRes.conf : 'Reservation'}
        description={selectedRes ? selectedRes.roomType : ''}
        footer={selectedRes && (
          checkedIn[selectedRes.id] || selectedRes.status === 'checked_in' ? (
            <div className="desk-drawer__footrow">
              <span style={{ fontSize: 12, color: 'var(--status-positive-ink)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Ic name="circle-check" size={15} /> Checked in — in-house
              </span>
              <BTN variant="secondary" onClick={() => setSelected(null)}>Close</BTN>
            </div>
          ) : (
            <div className="desk-drawer__footrow">
              <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Ready to check in</span>
              <BTN onClick={doCheckIn} loading={busy}><Ic name="log-in" size={15} /> Check in</BTN>
            </div>
          )
        )}
      >
        {selectedRes && <RB res={selectedRes} checkedIn={checkedIn[selectedRes.id] || selectedRes.status === 'checked_in'} />}
      </DW>

      <CP open={kOpen} onClose={() => setKOpen(false)} items={kItems} />
    </div>
  );
}

/* Ic (window.DeskShell.Icon) is already a global const from screens.jsx — reuse it. */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
