/* The Desk — Concept · The Rack: rooms × nights, stay bars, sacred status colors, hover context. */
(function () {
  const { RoomStatusChip, MoneyText } = window.AtriumVelaDesignSystem_ec9d90;
  const { Icon } = window.FD_Shell;
  const { useState } = React;

  const CELL_W = 76, ROOM_W = 148;
  const KIND_LABEL = { inhouse: 'In-house', arrival: 'Arriving today', future: 'Confirmed', departure: 'Departing' };

  function RackView({ days, rooms, stays, ooo, onStayClick }) {
    const [rtFilter, setRtFilter] = useState('All');
    const [hover, setHover] = useState(null); // { stay, x, y }
    const shown = rtFilter === 'All' ? rooms : rooms.filter((r) => r.rt === rtFilter);
    const staysByRoom = {};
    stays.forEach((s) => { (staysByRoom[s.room] = staysByRoom[s.room] || []).push(s); });
    const oooByRoom = {};
    ooo.forEach((o) => { oooByRoom[o.room] = o; });

    const bar = (s) => {
      const visStart = Math.max(0, s.start);
      const clipped = visStart - s.start;
      const visNights = Math.min(s.nights - clipped, days.length - visStart);
      if (visNights <= 0) return null;
      return { visStart, visNights, clipped };
    };

    return (
      <div className="fd-page">
        <div className="fd-page__head">
          <div>
            <h1 className="fd-h1">Rack</h1>
            <p className="fd-sub">14 nights from today · drag a bar to move or extend a stay (rate &amp; policy preview before commit).</p>
          </div>
          <div className="fd-segs">
            {['All', 'STD', 'KING', 'DLX'].map((rt) => (
              <button key={rt} className={'fd-seg' + (rtFilter === rt ? ' is-active' : '')} onClick={() => setRtFilter(rt)}>{rt}</button>
            ))}
          </div>
        </div>

        <div className="fd-rack">
          <div className="fd-rack__scroll">
            <div className="fd-rackgrid" style={{ gridTemplateColumns: `${ROOM_W}px repeat(${days.length}, ${CELL_W}px)` }}>
              {/* header row */}
              <div className="fd-rack__corner fd-rack__dayhead" style={{ alignItems: 'flex-start', padding: '0 12px', justifyContent: 'center' }}>
                <span className="dow">{days[0].month} — rooms</span>
              </div>
              {days.map((d) => (
                <div key={d.iso} className={'fd-rack__dayhead' + (d.i === 0 ? ' is-today' : '') + (d.weekend ? ' is-weekend' : '')}>
                  <span className="dow">{d.i === 0 ? 'TODAY' : d.dow}</span>
                  <span className="num">{d.num}</span>
                </div>
              ))}
              {/* room rows */}
              {shown.map((r) => (
                <React.Fragment key={r.num}>
                  <div className="fd-rack__roomcell">
                    <span className="fd-rack__roomnum">{r.num}</span>
                    <span className="fd-rack__roomrt">{r.rt}</span>
                    <span className="fd-rack__dot" style={{ background: `var(--room-${r.state})` }} title={r.state} />
                  </div>
                  {days.map((d) => {
                    const o = oooByRoom[r.num];
                    const isOoo = o && d.i >= o.start && d.i < o.start + o.nights;
                    return (
                      <div key={d.iso}
                        className={'fd-rack__cell' + (d.i === 0 ? ' is-today' : '') + (d.weekend ? ' is-weekend' : '') + (isOoo ? ' is-ooo' : '')}>
                        {/* OOO label once, at range start */}
                        {o && d.i === o.start && (
                          <span className="fd-stay fd-stay--ooo" style={{ left: 4, width: o.nights * CELL_W - 10 }}>
                            <Icon name="wrench" size={12} /> {o.reason}
                          </span>
                        )}
                        {(staysByRoom[r.num] || []).map((s) => {
                          const b = bar(s);
                          if (!b || b.visStart !== d.i) return null;
                          return (
                            <button key={s.id}
                              className={'fd-stay fd-stay--' + s.kind}
                              style={{ left: 3, width: b.visNights * CELL_W - 8,
                                borderTopLeftRadius: b.clipped ? 2 : undefined, borderBottomLeftRadius: b.clipped ? 2 : undefined }}
                              onClick={() => onStayClick(s)}
                              onMouseEnter={(e) => setHover({ stay: s, x: e.clientX, y: e.clientY })}
                              onMouseMove={(e) => setHover({ stay: s, x: e.clientX, y: e.clientY })}
                              onMouseLeave={() => setHover(null)}>
                              <span className="fd-stay__ch" style={{ background: `var(--channel-${s.channel})` }} />
                              {s.guest}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="fd-legend">
          <span className="fd-legend__item"><span className="fd-legend__swatch" style={{ background: 'var(--accent-600)' }} /> In-house</span>
          <span className="fd-legend__item"><span className="fd-legend__swatch" style={{ background: 'var(--bg-surface)', border: '1.5px solid var(--sky-500)' }} /> Arriving today</span>
          <span className="fd-legend__item"><span className="fd-legend__swatch" style={{ background: 'var(--violet-500)' }} /> Departing</span>
          <span className="fd-legend__item"><span className="fd-legend__swatch" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--line-strong)' }} /> Confirmed</span>
          <span className="fd-legend__item"><span className="fd-legend__swatch" style={{ background: 'repeating-linear-gradient(-45deg, transparent 0 4px, oklch(from var(--rose-500) l c h / .35) 4px 6px)' }} /> Out of order</span>
          <span style={{ flex: 1 }} />
          <RoomStatusChip state="vacant-clean" />
          <RoomStatusChip state="vacant-dirty" />
          <RoomStatusChip state="inspected" />
          <RoomStatusChip state="occupied" />
        </div>

        {hover && (
          <div className="fd-hovercard" style={{
            left: Math.min(hover.x + 14, window.innerWidth - 300),
            top: Math.min(hover.y + 14, window.innerHeight - 170) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <b style={{ fontSize: 14 }}>{hover.stay.guest}</b>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase',
                color: hover.stay.kind === 'arrival' ? 'var(--status-info-ink)' : 'var(--ink-tertiary)' }}>
                {KIND_LABEL[hover.stay.kind]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--ink-secondary)' }}>
              <span>Room {hover.stay.room} · {hover.stay.nights} night{hover.stay.nights > 1 ? 's' : ''}</span>
              <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rate / night</span><MoneyText amount={hover.stay.rate} />
              </span>
              <span style={{ color: 'var(--ink-tertiary)', fontSize: 11.5 }}>
                {hover.stay.kind === 'arrival' ? 'Enter to start check-in · → cycles alternates' : 'Drag to move · edge-drag to extend'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  window.FD_Rack = { RackView };
})();
