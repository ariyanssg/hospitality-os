/* The Desk — demo data, derived from the repo's seed (tooling/seed/index.ts).
   Property: "Grand Vela — Ocean Club" (GVOC, USD). Guests & room types match the seed. */
window.DESK_DATA = (function () {
  const properties = [
    { id: 'gvoc', name: 'Grand Vela — Ocean Club', code: 'GVOC', currency: 'USD' },
    { id: 'gvch', name: 'Grand Vela — Cliff House', code: 'GVCH', currency: 'USD' },
    { id: 'gvla', name: 'Grand Vela — Laguna', code: 'GVLA', currency: 'MXN' },
  ];

  const me = { name: 'Frankie Doyle', email: 'frankie@grand-vela.demo', role: 'Front Desk' };

  // Today's arrivals the desk will work. Readiness drives the board.
  const arrivals = [
    { id: 'r0', conf: 'BK-1000', first: 'Dana', last: 'Rivera', adults: 2, children: 0, roomType: 'King Ocean View', rt: 'KING', nights: 1, channel: 'direct', status: 'confirmed', assigned: '412', inspected: true, paid: true, vip: false, balance: '240.00', total: '264.00', traits: ['2nd stay', 'prefers high floor'] },
    { id: 'r1', conf: 'BK-1001', first: 'Ito', last: 'Nakamura', adults: 1, children: 0, roomType: 'Deluxe Suite', rt: 'DLX', nights: 2, channel: 'ota', status: 'confirmed', assigned: null, inspected: false, paid: true, vip: false, balance: '840.00', total: '924.00', traits: ['quiet floor', 'late arrival 15:40'] },
    { id: 'r2', conf: 'BK-1002', first: 'Priya', last: 'Patel', adults: 2, children: 1, roomType: 'Standard Queen', rt: 'STD', nights: 3, channel: 'direct', status: 'confirmed', assigned: '208', inspected: true, paid: false, vip: true, balance: '540.00', total: '594.00', traits: ['3rd stay', 'prefers high floor', 'allergy: nuts'] },
    { id: 'r3', conf: 'BK-1003', first: 'Marcus', last: 'Bell', adults: 2, children: 0, roomType: 'King Ocean View', rt: 'KING', nights: 1, channel: 'ota', status: 'confirmed', assigned: null, inspected: false, paid: true, vip: false, balance: '240.00', total: '264.00', traits: ['anniversary'] },
    { id: 'r4', conf: 'BK-1004', first: 'Sofia', last: 'Marino', adults: 1, children: 0, roomType: 'Deluxe Suite', rt: 'DLX', nights: 2, channel: 'direct', status: 'confirmed', assigned: '515', inspected: true, paid: true, vip: true, balance: '0.00', total: '840.00', traits: ['VIP — repeat', 'champagne on arrival'] },
    { id: 'r5', conf: 'BK-1005', first: 'Liam', last: "O\u2019Brien", adults: 2, children: 2, roomType: 'Standard Queen', rt: 'STD', nights: 3, channel: 'ota', status: 'confirmed', assigned: null, inspected: false, paid: false, vip: false, balance: '540.00', total: '594.00', traits: ['family · 2 children', 'connecting rooms'] },
    { id: 'r6', conf: 'BK-1006', first: 'Chen', last: 'Wei', adults: 1, children: 0, roomType: 'King Ocean View', rt: 'KING', nights: 2, channel: 'corporate', status: 'confirmed', assigned: '410', inspected: true, paid: true, vip: false, balance: '480.00', total: '528.00', traits: ['corporate rate', 'early checkout'] },
    { id: 'r7', conf: 'BK-1007', first: 'Amara', last: 'Okafor', adults: 2, children: 0, roomType: 'Deluxe Suite', rt: 'DLX', nights: 1, channel: 'direct', status: 'confirmed', assigned: '518', inspected: false, paid: true, vip: false, balance: '420.00', total: '462.00', traits: ['ocean view requested'] },
  ];

  const nightlyByRt = { KING: '240.00', DLX: '420.00', STD: '180.00' };

  return { properties, me, arrivals, nightlyByRt };
})();
