/* The Desk — app shell: Icon, TopBar, Rail, CommandPalette, Drawer.
   Composes Atrium primitives from the compiled bundle; the shell chrome is product-specific. */
const { Button, Input, Badge, Avatar, Kbd } = window.AtriumVelaDesignSystem_ec9d90;
const { useState, useEffect, useRef } = React;

/* Lucide icon — rendered declaratively (React owns the markup). Never use lucide.createIcons():
   it replaces React-owned nodes and crashes reconciliation. */
const deskPascal = (n) => n.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
function deskLucideSvg(name, size) {
  const L = window.lucide;
  if (!L) return '';
  const p = deskPascal(name);
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
function Icon({ name, size = 16, className = '', style }) {
  const html = React.useMemo(() => deskLucideSvg(name, size), [name, size]);
  return <i className={className} aria-hidden="true"
    style={{ width: size, height: size, display: 'inline-flex', ...style }}
    dangerouslySetInnerHTML={{ __html: html }} />;
}
function refreshIcons() { /* no-op — icons render declaratively */ }

/* ── Top bar (56px) ──────────────────────────────────────────────────────── */
function TopBar({ me, property, properties, onProperty, theme, onToggleTheme, onOpenK, onCreate }) {
  const [propOpen, setPropOpen] = useState(false);
  const initials = me.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <header className="desk-topbar">
      <div className="desk-brand">
        <img src="../../assets/vela-mark.svg" width="26" height="26" alt="" />
        <span className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Vela</span>
      </div>

      <div className="desk-prop">
        <button className="desk-chip" onClick={() => setPropOpen((o) => !o)}>
          <Icon name="building-2" size={15} style={{ color: 'var(--ink-tertiary)' }} />
          <span style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{property.name}</span>
          <Kbd>⌘P</Kbd>
          <Icon name="chevron-down" size={14} style={{ color: 'var(--ink-tertiary)' }} />
        </button>
        {propOpen && (
          <div className="desk-menu" style={{ width: 280 }}>
            {properties.map((p) => (
              <button key={p.id} className="desk-menu__item" onClick={() => { onProperty(p); setPropOpen(false); }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{p.code} · {p.currency}</div>
                </div>
                {p.id === property.id && <Icon name="check" size={16} style={{ color: 'var(--ink-accent)' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="desk-search" onClick={onOpenK}>
        <Icon name="search" size={16} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search &amp; command…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div className="desk-topbar__right">
        <Button variant="primary" size="sm" onClick={onCreate}>
          <Icon name="plus" size={15} /> Create
        </Button>
        <button className="desk-iconbtn" onClick={onToggleTheme} aria-label="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
        <button className="desk-iconbtn" aria-label="Notifications">
          <Icon name="bell" size={16} />
          <span className="desk-iconbtn__dot" />
        </button>
        <span className="desk-avatar" title={me.email}>{initials}</span>
      </div>
    </header>
  );
}

/* ── Nav rail (220px) ────────────────────────────────────────────────────── */
const NAV = [
  { id: 'today', label: 'Today', icon: 'layout-grid' },
  { id: 'arrivals', label: 'Arrivals', icon: 'calendar-check' },
  { id: 'inhouse', label: 'In-house', icon: 'users' },
  { id: 'departures', label: 'Departures', icon: 'door-open' },
  { id: 'rack', label: 'Rack', icon: 'bed-double' },
  { id: 'folios', label: 'Folios', icon: 'receipt' },
  { id: 'housekeeping', label: 'Housekeeping', icon: 'sparkles' },
];
function Rail({ route, onRoute, onSignOut }) {
  return (
    <nav className="desk-rail">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={'desk-railitem' + (route === item.id ? ' is-active' : '')}
            onClick={() => onRoute(item.id)}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </div>
      <button className="desk-railitem desk-railitem--muted" onClick={onSignOut}>
        <Icon name="log-out" size={16} /> Sign out
      </button>
    </nav>
  );
}

/* ── Command palette (⌘K) ────────────────────────────────────────────────── */
function CommandPalette({ open, onClose, items }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) { setQuery(''); setActive(0); requestAnimationFrame(() => inputRef.current && inputRef.current.focus()); }
  }, [open]);
  if (!open) return null;
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((it) => (it.label + ' ' + (it.group || '') + ' ' + (it.hint || '')).toLowerCase().includes(q)) : items;
  const groups = [];
  filtered.forEach((it) => {
    const g = it.group || 'Actions';
    let bucket = groups.find((x) => x[0] === g);
    if (!bucket) { bucket = [g, []]; groups.push(bucket); }
    bucket[1].push(it);
  });
  const run = (it) => { it.run(); onClose(); };
  return (
    <div className="desk-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <button className="desk-scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div className="desk-palette__panel">
        <div className="desk-palette__field">
          <Icon name="search" size={18} style={{ color: 'var(--ink-tertiary)' }} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search & command…"
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); run(filtered[active]); }
              else if (e.key === 'Escape') onClose();
            }}
          />
          <Kbd>esc</Kbd>
        </div>
        <div className="desk-palette__list">
          {filtered.length === 0 ? (
            <p className="desk-palette__empty">No matches for “{query}”.</p>
          ) : groups.map(([group, gItems]) => (
            <div key={group} style={{ padding: '0 8px' }}>
              <p className="desk-palette__group">{group}</p>
              {gItems.map((it) => {
                const idx = filtered.indexOf(it);
                return (
                  <button
                    key={it.id}
                    className={'desk-palette__item' + (idx === active ? ' is-active' : '')}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => run(it)}
                  >
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

/* ── Right drawer ────────────────────────────────────────────────────────── */
function Drawer({ open, onClose, title, description, children, footer, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="desk-drawer" role="dialog" aria-modal="true">
      <button className="desk-scrim" aria-label="Close" tabIndex={-1} onClick={onClose} />
      <div className="desk-drawer__panel" style={{ width }}>
        <header className="desk-drawer__head">
          <div>
            <h2 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h2>
            {description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-tertiary)' }} className="font-mono">{description}</p>}
          </div>
          <button className="desk-iconbtn" onClick={onClose} aria-label="Close drawer"><Icon name="x" size={16} /></button>
        </header>
        <div className="desk-drawer__body">{children}</div>
        {footer && <footer className="desk-drawer__foot">{footer}</footer>}
      </div>
    </div>
  );
}

window.DeskShell = { Icon, refreshIcons, TopBar, Rail, CommandPalette, Drawer, NAV };
