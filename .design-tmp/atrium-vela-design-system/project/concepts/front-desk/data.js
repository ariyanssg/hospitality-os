/* The Desk — Concept · demo data. Property "Grand Vela — Ocean Club" (GVOC, USD).
   Dates are computed from the real today so the Rack always reads current. */
window.FD_DATA = (function () {
  const DAY = 86400000;
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const fmtD = (d) => d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(t0.getTime() + i * DAY);
    return { i, iso: d.toISOString().slice(0, 10), dow: fmtD(d), num: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }), weekend: [0, 6].includes(d.getDay()) };
  });

  const properties = [
    { id: 'gvoc', name: 'Grand Vela — Ocean Club', code: 'GVOC', currency: 'USD' },
    { id: 'gvch', name: 'Grand Vela — Cliff House', code: 'GVCH', currency: 'USD' },
    { id: 'gvla', name: 'Grand Vela — Laguna', code: 'GVLA', currency: 'MXN' },
  ];
  const me = { name: 'Frankie Doyle', email: 'frankie@grand-vela.demo', role: 'Front Desk' };

  /* Arrivals — readiness facets drive the composite chip; score = facets true. */
  const mk = (id, conf, first, last, rt, roomType, rate, nights, eta, channel, vip, f, traits) => ({
    id, conf, first, last, rt, roomType, rate, nights, eta, channel, vip,
    room: f.room || null, inspected: !!f.inspected, paid: !!f.paid, regcard: !!f.regcard, key: !!f.key,
    online: f.online || null, /* self-service journey: 'done' | 'started' | null */
    status: 'confirmed', adults: f.adults || 2, children: f.children || 0, traits: traits || [],
    balance: f.paid ? '0.00' : (Number(rate) * nights).toFixed(2),
  });
  const arrivals = [
    mk('a1', 'BK-1042', 'Priya', 'Patel', 'DLX', 'Deluxe Suite', '420.00', 2, '14:00', 'direct', true,
      { room: '515', inspected: true, paid: true, regcard: true, key: false, children: 1, online: 'done' },
      ['3rd stay', 'prefers high floor', 'allergy: nuts']),
    mk('a2', 'BK-1031', 'Dana', 'Rivera', 'KING', 'King Ocean View', '240.00', 1, '15:00', 'direct', false,
      { room: '412', inspected: true, paid: true, regcard: true, key: true, online: 'done' },
      ['2nd stay', 'high floor']),
    mk('a3', 'BK-1018', 'Ito', 'Nakamura', 'DLX', 'Deluxe Suite', '420.00', 2, '15:40', 'ota', false,
      { room: null, inspected: false, paid: true, regcard: false, key: false, adults: 1 },
      ['quiet floor', 'late arrival']),
    mk('a4', 'BK-1027', 'Marcus', 'Bell', 'KING', 'King Ocean View', '240.00', 1, '16:00', 'ota', false,
      { room: null, inspected: false, paid: true, regcard: true, key: false, online: 'started' },
      ['anniversary']),
    mk('a5', 'BK-1009', 'Sofia', 'Marino', 'DLX', 'Deluxe Suite', '420.00', 3, '13:30', 'corporate', true,
      { room: '518', inspected: true, paid: true, regcard: true, key: true, adults: 1, online: 'done' },
      ['VIP — repeat', 'champagne on arrival']),
    mk('a6', 'BK-1056', 'Liam', 'O\u2019Brien', 'STD', 'Standard Queen', '180.00', 3, '17:15', 'ota', false,
      { room: null, inspected: false, paid: false, regcard: false, key: false, children: 2 },
      ['family', 'connecting rooms']),
    mk('a7', 'BK-1061', 'Chen', 'Wei', 'KING', 'King Ocean View', '240.00', 2, '12:45', 'corporate', false,
      { room: '410', inspected: true, paid: true, regcard: true, key: true, adults: 1 },
      ['corporate rate']),
    mk('a8', 'BK-1063', 'Amara', 'Okafor', 'DLX', 'Deluxe Suite', '420.00', 1, '18:00', 'direct', false,
      { room: '512', inspected: false, paid: true, regcard: false, key: false },
      ['ocean view requested']),
    mk('a9', 'BK-1070', 'Yusuf', 'Demir', 'STD', 'Standard Queen', '180.00', 2, '19:30', 'group', false,
      { room: '204', inspected: true, paid: false, regcard: false, key: false },
      ['group: Marlin Conf.']),
  ];

  /* The live OTA booking that slides in (zero-refresh thesis). */
  const liveBooking = mk('a10', 'BK-1077', 'Lena', 'Hoffmann', 'KING', 'King Ocean View', '240.00', 2, '20:00', 'ota', false,
    { room: null, inspected: false, paid: true, regcard: false, key: false, adults: 1, online: 'started' },
    ['booked just now']);

  /* Departures — mirror of arrivals: readiness = folio balanced · no disputes · late-checkout flag.
     Express path: Enter → folio review → settle → emailed invoice. */
  const departures = [
    { id: 'd1', conf: 'BK-0961', first: 'Camila', last: 'Aldana', room: '511', rt: 'DLX', nights: 4, due: '11:00',
      balance: '0.00', folioOk: true, dispute: false, late: null, method: 'Card on file — settled', channel: 'corporate' },
    { id: 'd2', conf: 'BK-0948', first: 'Piotr', last: 'Kowalski', room: '206', rt: 'STD', nights: 4, due: '14:00',
      balance: '0.00', folioOk: true, dispute: false, late: 'Late checkout approved — 14:00 (+$40 posted)', method: 'Visa ••42 — settled', channel: 'direct' },
    { id: 'd3', conf: 'BK-0957', first: 'Margaux', last: 'Fontaine', room: '405', rt: 'KING', nights: 3, due: '12:00',
      balance: '86.50', folioOk: false, dispute: false, late: null, method: 'Minibar posted 07:40 — collect at desk', channel: 'ota' },
    { id: 'd4', conf: 'BK-0939', first: 'Theo', last: 'Laurent', room: '309', rt: 'KING', nights: 2, due: '11:00',
      balance: '0.00', folioOk: true, dispute: true, late: null, method: 'Chargeback inquiry open — evidence pack ready', channel: 'ota' },
    { id: 'd5', conf: 'BK-0944', first: 'Naledi', last: 'Mbeki', room: '514', rt: 'DLX', nights: 5, due: '12:00',
      balance: '1240.00', folioOk: false, dispute: false, late: null, method: 'Direct bill → Marlin Corp (AR transfer)', channel: 'corporate' },
  ];

  /* Housekeeping — room-ready queue prioritized by imminent arrival. */
  const hkQueue = [
    { room: '512', rt: 'DLX', state: 'vacant-dirty', assignee: 'Rosa M.', eta: '25m', arrival: 'Okafor · 18:00', priority: true },
    { room: '202', rt: 'STD', state: 'vacant-dirty', assignee: 'Daniel K.', eta: '30m', arrival: 'O’Brien · 17:15', priority: true },
    { room: '415', rt: 'KING', state: 'vacant-dirty', assignee: '— unassigned', eta: '—', arrival: 'Nakamura · 15:40', priority: true },
    { room: '511', rt: 'DLX', state: 'vacant-dirty', assignee: 'Rosa M.', eta: 'after 512', arrival: 'Brandt · Sat', priority: false },
    { room: '201', rt: 'STD', state: 'vacant-clean', assignee: 'inspect — Daniel K.', eta: '15m', arrival: 'Hoffmann · 20:00', priority: false },
    { room: '304', rt: 'KING', state: 'ooo', assignee: 'Engineering', eta: 'Fri', arrival: 'blocked — plumbing', priority: false },
  ];

  /* AI layer — assistive, approve-before-publish (high-confidence, workflow-adjacent only). */
  const aiSuggestions = [
    { id: 'ai1', kind: 'pricing', icon: 'trending-up', confidence: '87%',
      title: 'Raise KING BAR +8% Fri–Sat', body: 'City event detected · forecast occupancy 92% · comp set trending +6%. Publishes to all channels on approval.',
      actions: ['Approve & publish', 'Simulate'] },
    { id: 'ai2', kind: 'upsell', icon: 'arrow-big-up-dash', confidence: '3 ranked',
      title: 'Upgrade offers likely to convert', body: 'Patel (DLX→520 corner), Bell (anniversary — KING high floor), Hoffmann (booked entry rate). Offers surface in their check-in flow.',
      actions: ['Queue offers'] },
    { id: 'ai3', kind: 'anomaly', icon: 'siren', confidence: 'new',
      title: 'F&B voids +18% vs 4-week trend', body: 'Concentrated in POS shift 2 (Tue–Wed). Pattern matches training-gap, not leakage.',
      actions: ['Open report'] },
    { id: 'ai4', kind: 'recon', icon: 'git-compare-arrows', confidence: '2 items',
      title: 'Gateway captures unmatched', body: 'Two captures ( $240.00, $86.50 ) have no posting match. Auto-match suggestions ready for review.',
      actions: ['Review matches'] },
  ];

  /* Distribution / channel health — zero-lag thesis, observable. */
  const channels = [
    { name: 'Booking.com', ok: true, lag: '4s', note: 'parity OK' },
    { name: 'Expedia', ok: false, lag: '9s', note: 'rate-map warning · DLX' },
    { name: 'GDS', ok: true, lag: '11s', note: 'parity OK' },
    { name: 'Booking engine', ok: true, lag: '<1s', note: 'direct' },
  ];

  /* Night audit — the 90-second ritual. */
  const nightAudit = [
    { id: 'na1', label: 'No-show processing', detail: '1 candidate (BK-1071 · guaranteed) — fee rule: 1 night', state: 'ready' },
    { id: 'na2', label: 'Unposted room & tax', detail: '62 in-house rooms — auto-post on close', state: 'ready' },
    { id: 'na3', label: 'Open folios with credit limit breach', detail: 'None', state: 'done' },
    { id: 'na4', label: 'Cashier sessions', detail: 'Frankie D. open — count & close before audit', state: 'blocked' },
    { id: 'na5', label: 'Gateway batch settlement', detail: '41 captures queued · est. 90s', state: 'ready' },
    { id: 'na6', label: 'Business date roll → trial balance', detail: 'Ledger ties by construction — report emails to GM', state: 'ready' },
  ];

  /* Rack — 14 rooms × 14 days. state drives the left-rail dot; stays render as bars.
     kind: inhouse | arrival | future | departure  (maps to bar styling) */
  const rooms = [
    { num: '201', rt: 'STD', state: 'vacant-clean' },
    { num: '202', rt: 'STD', state: 'vacant-dirty' },
    { num: '204', rt: 'STD', state: 'inspected' },
    { num: '206', rt: 'STD', state: 'occupied' },
    { num: '304', rt: 'KING', state: 'ooo' },
    { num: '405', rt: 'KING', state: 'occupied' },
    { num: '410', rt: 'KING', state: 'inspected' },
    { num: '412', rt: 'KING', state: 'inspected' },
    { num: '415', rt: 'KING', state: 'vacant-dirty' },
    { num: '511', rt: 'DLX', state: 'occupied' },
    { num: '512', rt: 'DLX', state: 'vacant-dirty' },
    { num: '515', rt: 'DLX', state: 'inspected' },
    { num: '518', rt: 'DLX', state: 'inspected' },
    { num: '520', rt: 'DLX', state: 'vacant-clean' },
  ];
  const stays = [
    { id: 's1', room: '206', start: -2, nights: 4, guest: 'Kowalski', channel: 'direct', kind: 'inhouse', rate: '180.00' },
    { id: 's2', room: '405', start: -1, nights: 3, guest: 'Fontaine', channel: 'ota', kind: 'inhouse', rate: '240.00' },
    { id: 's3', room: '511', start: -3, nights: 4, guest: 'Aldana', channel: 'corporate', kind: 'departure', rate: '420.00' },
    { id: 's4', room: '412', start: 0, nights: 1, guest: 'Rivera', channel: 'direct', kind: 'arrival', rate: '240.00' },
    { id: 's5', room: '515', start: 0, nights: 2, guest: 'Patel', channel: 'direct', kind: 'arrival', rate: '420.00' },
    { id: 's6', room: '518', start: 0, nights: 3, guest: 'Marino', channel: 'corporate', kind: 'arrival', rate: '420.00' },
    { id: 's7', room: '410', start: 0, nights: 2, guest: 'Wei', channel: 'corporate', kind: 'arrival', rate: '240.00' },
    { id: 's8', room: '204', start: 0, nights: 2, guest: 'Demir', channel: 'group', kind: 'arrival', rate: '180.00' },
    { id: 's9', room: '512', start: 0, nights: 1, guest: 'Okafor', channel: 'direct', kind: 'arrival', rate: '420.00' },
    { id: 's10', room: '201', start: 2, nights: 3, guest: 'Svensson', channel: 'ota', kind: 'future', rate: '180.00' },
    { id: 's11', room: '415', start: 3, nights: 4, guest: 'Moreau', channel: 'direct', kind: 'future', rate: '240.00' },
    { id: 's12', room: '520', start: 1, nights: 2, guest: 'Tanaka', channel: 'ota', kind: 'future', rate: '420.00' },
    { id: 's13', room: '202', start: 4, nights: 2, guest: 'Iyer', channel: 'corporate', kind: 'future', rate: '180.00' },
    { id: 's14', room: '206', start: 5, nights: 3, guest: 'Walsh', channel: 'direct', kind: 'future', rate: '180.00' },
    { id: 's15', room: '511', start: 2, nights: 4, guest: 'Brandt', channel: 'group', kind: 'future', rate: '420.00' },
    { id: 's16', room: '405', start: 6, nights: 2, guest: 'Costa', channel: 'ota', kind: 'future', rate: '240.00' },
    { id: 's17', room: '412', start: 3, nights: 3, guest: 'N\u2019Diaye', channel: 'direct', kind: 'future', rate: '240.00' },
  ];
  const ooo = [{ room: '304', start: 0, nights: 6, reason: 'Plumbing — ETA Fri' }];

  /* Suggested + alternate rooms for the check-in flow. */
  const roomSuggestions = {
    DLX: [
      { num: '512', reason: 'high floor · inspected 13:05 · matches preference', ready: true },
      { num: '520', reason: 'corner suite · vacant clean', ready: true },
      { num: '511', reason: 'departs 11:00 — queue for 14:30', ready: false },
    ],
    KING: [
      { num: '412', reason: 'high floor · inspected 12:40', ready: true },
      { num: '415', reason: 'ocean side — HK in progress', ready: false },
      { num: '410', reason: 'inspected 11:55', ready: true },
    ],
    STD: [
      { num: '204', reason: 'inspected 12:10 · near elevator', ready: true },
      { num: '201', reason: 'vacant clean', ready: true },
      { num: '202', reason: 'HK in progress — ETA 30m', ready: false },
    ],
  };
  const upsell = { DLX: null, KING: { to: 'Deluxe Suite', delta: '84.00' }, STD: { to: 'King Ocean View', delta: '60.00' } };

  return { days, properties, me, arrivals, liveBooking, rooms, stays, ooo, roomSuggestions, upsell,
    departures, hkQueue, aiSuggestions, channels, nightAudit };
})();
