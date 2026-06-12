/* The Desk — Concept · shell: Icon, TopBar, Rail, CommandPalette, ActionTray, Toast. */
(function () {
  const { Button, Kbd } = window.AtriumVelaDesignSystem_ec9d90;
  const { useState, useEffect, useRef } = React;

  /* Lucide icon — rendered declaratively (React owns the markup). Never use lucide.createIcons():
     it replaces React-owned nodes and crashes reconciliation. */
  const PASCAL = (n) => n.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  function lucideSvg(name, size) {
    const L = window.lucide;
    if (!L) return '';
    const p = PASCAL(name);
    const node = (L.icons && L.icons[p]) || L[p];
    if (!node) return '';
    try {
      if (L.createElement) {
        const el = L.createElement(node);
        el.setAttribute('width', String(size));
        el.setAttribute('height', String(size));
        el.setAttribute('stroke-width', '1.5');
        return el.outerHTML;
      }
    } catch (e) { /* fall through */ }
    if (Array.isArray(node)) {
      const kids = node.map(([t, a]) => '<' + t + ' ' + Object.entries(a || {}).map(([k, v]) => k + '="' + v + '"').join(' ') + '/>').join('');
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + kids + '</svg>';
    }
    return '';
  }
  function Icon({ name, size = 16, style, className }) {
    const html = React.useMemo(() => lucideSvg(name, size), [name, size]);
    return <i className={className} aria-hidden="true"
      style={{ width: size, height: size, display: 'inline-flex', ...style }}
      dangerouslySetInnerHTML={{ __html: html }} />;
  }
  function refreshIcons() { /* no-op — icons render declaratively */ }

  /* ── Top bar ─────────────────────────────────────────────────────── */
  function TopBar({ me, property, properties, onProperty, theme, onToggleTheme, density, onDensity, onOpenK }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);
    const initials = me.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return (
      <header className="fd-topbar">
        <div className="fd-brand">
          <img src="../../assets/vela-mark.svg" width="26" height="26" alt="Vela" />
          <b>Vela</b>
        </div>
        <div style={{ position: 'relative' }} ref={ref}>
          <button className="fd-chip" onClick={() => setOpen((o) => !o)}>
            <Icon name="building-2" size={15} style={{ color: 'var(--ink-tertiary)' }} />
            <span style={{ fontWeight: 500 }}>{property.name}</span>
            <Kbd>⌘P</Kbd>
            <Icon name="chevron-down" size={13} style={{ color: 'var(--ink-tertiary)' }} />
          </button>
          {open && (
            <div className="fd-menu">
              {properties.map((p) => (
                <button key={p.id} className="fd-menu__item" onClick={() => { onProperty(p); setOpen(false); }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                    <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{p.code} · {p.currency}</div>
                  </div>
                  {p.id === property.id && <Icon name="check" size={15} style={{ color: 'var(--ink-accent)' }} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="fd-search" onClick={onOpenK}>
          <Icon name="search" size={15} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search &amp; command — guests, rooms, actions…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <div className="fd-topbar__right">
          <Button variant="primary" size="sm"><Icon name="plus" size={14} /> Create</Button>
          <button className="fd-iconbtn" onClick={onDensity} title={'Density: ' + density} aria-label="Cycle density">
            <Icon name={density === 'compact' ? 'rows-4' : density === 'touch' ? 'rows-2' : 'rows-3'} size={16} />
          </button>
          <button className="fd-iconbtn" onClick={onToggleTheme} aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
          <button className="fd-iconbtn" aria-label="Notifications">
            <Icon name="bell" size={16} />
            <span className="fd-iconbtn__dot" />
          </button>
          <span className="fd-me" title={me.email}>{initials}</span>
        </div>
      </header>
    );
  }

  /* ── Rail ────────────────────────────────────────────────────────── */
  const NAV = [
    { id: 'today', label: 'Today', icon: 'layout-grid', kbd: 'g t' },
    { id: 'arrivals', label: 'Arrivals', icon: 'calendar-check', kbd: 'g a' },
    { id: 'rack', label: 'Rack', icon: 'bed-double', kbd: 'g r' },
    { id: 'inhouse', label: 'In-house', icon: 'users' },
    { id: 'departures', label: 'Departures', icon: 'door-open' },
    { id: 'folios', label: 'Folios', icon: 'receipt' },
    { id: 'housekeeping', label: 'Housekeeping', icon: 'sparkles' },
  ];
  function Rail({ route, onRoute }) {
    return (
      <nav className="fd-rail">
        <div className="fd-rail__grow">
          {NAV.map((n) => (
            <button key={n.id} className={'fd-railitem' + (route === n.id ? ' is-active' : '')} onClick={() => onRoute(n.id)}>
              <Icon name={n.icon} size={16} />
              {n.label}
              {n.kbd && <span className="fd-railkbd"><Kbd>{n.kbd}</Kbd></span>}
            </button>
          ))}
          <p className="fd-rail__sec">Night</p>
          <button className={'fd-railitem' + (route === 'audit' ? ' is-active' : '')} onClick={() => onRoute('audit')}>
            <Icon name="moon-star" size={16} /> Night audit
          </button>
        </div>
        <button className="fd-railitem" style={{ color: 'var(--ink-tertiary)' }}>
          <Icon name="log-out" size={16} /> Sign out
        </button>
      </nav>
    );
  }

  /* ── Navbar tabs (horizontal nav — default layout) ───────────────── */
  function NavTabs({ route, onRoute, badges = {} }) {
    const items = [...NAV, { id: 'audit', label: 'Night audit', icon: 'moon-star' }];
    return (
      <nav className="fd-navtabs" aria-label="Boards">
        {items.map((n) => (
          <button key={n.id} className={'fd-navtab' + (route === n.id ? ' is-active' : '')} onClick={() => onRoute(n.id)}>
            <Icon name={n.icon} size={15} />
            {n.label}
            {badges[n.id] > 0 && <span className="fd-navtab__badge tnum">{badges[n.id]}</span>}
          </button>
        ))}
      </nav>
    );
  }

  /* ── Command palette ─────────────────────────────────────────────── */
  function CommandPalette({ open, onClose, items }) {
    const [q, setQ] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    useEffect(() => {
      if (open) { setQ(''); setActive(0); requestAnimationFrame(() => inputRef.current && inputRef.current.focus()); }
    }, [open]);
    if (!open) return null;
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? items.filter((it) => (it.label + ' ' + (it.group || '') + ' ' + (it.hint || '')).toLowerCase().includes(needle))
      : items;
    const groups = [];
    filtered.forEach((it) => {
      const g = it.group || 'Actions';
      let b = groups.find((x) => x[0] === g);
      if (!b) { b = [g, []]; groups.push(b); }
      b[1].push(it);
    });
    const run = (it) => { it.run(); onClose(); };
    return (
      <div className="fd-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <button className="fd-scrim" tabIndex={-1} aria-label="Close" onClick={onClose} />
        <div className="fd-palette__panel">
          <div className="fd-palette__field">
            <Icon name="search" size={17} style={{ color: 'var(--ink-tertiary)' }} />
            <input
              ref={inputRef} value={q} placeholder="Type a guest, room, or action…"
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                else if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); run(filtered[active]); }
                else if (e.key === 'Escape') onClose();
              }}
            />
            <Kbd>esc</Kbd>
          </div>
          <div className="fd-palette__list">
            {filtered.length === 0 ? (
              <p className="fd-palette__empty">No matches for “{q}”.</p>
            ) : groups.map(([g, gi]) => (
              <div key={g}>
                <p className="fd-palette__group">{g}</p>
                {gi.map((it) => {
                  const idx = filtered.indexOf(it);
                  return (
                    <button key={it.id} className={'fd-palette__item' + (idx === active ? ' is-active' : '')}
                      onMouseMove={() => setActive(idx)} onClick={() => run(it)}>
                      <Icon name={it.icon} size={16} style={{ color: 'var(--ink-tertiary)' }} />
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {it.hint && <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{it.hint}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Action tray (appears on selection) ──────────────────────────── */
  function ActionTray({ count, onClear, onAssign, onPrereg }) {
    if (!count) return null;
    return (
      <div className="fd-tray" role="toolbar" aria-label="Bulk actions">
        <span className="fd-tray__count tnum">{count} selected</span>
        <button className="fd-tray__btn" onClick={onAssign}><Icon name="wand-sparkles" size={15} /> Auto-assign rooms</button>
        <button className="fd-tray__btn" onClick={onPrereg}><Icon name="clipboard-check" size={15} /> Pre-register</button>
        <button className="fd-tray__btn"><Icon name="message-square" size={15} /> Message</button>
        <button className="fd-tray__btn" onClick={onClear} aria-label="Clear selection"><Icon name="x" size={15} /></button>
      </div>
    );
  }

  /* ── Toast (action-capable) ──────────────────────────────────────── */
  function Toast({ toast, onUndo }) {
    if (!toast) return null;
    return (
      <div className="fd-toast" role="status">
        <Icon name={toast.icon || 'circle-check'} size={17} style={{ color: toast.tone === 'info' ? 'var(--status-info-ink)' : 'var(--status-positive-ink)' }} />
        <span>{toast.text}</span>
        {toast.undo && <button className="fd-toast__undo" onClick={onUndo}>Undo</button>}
      </div>
    );
  }

  window.FD_Shell = { Icon, refreshIcons, TopBar, Rail, NavTabs, CommandPalette, ActionTray, Toast, NAV };
})();
