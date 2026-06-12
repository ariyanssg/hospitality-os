import React from 'react';

/**
 * Avatar — identity chip with optional presence dot (doc 17 §4: Avatar +presence). Falls back to
 * initials on the accent-selected wash. Presence shows who is live on a record.
 */
const CSS = `
.atr-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;
  border-radius:var(--radius-full);background:var(--interactive-selected);color:var(--ink-accent);
  font-family:var(--font-ui);font-weight:600;overflow:visible;flex:none;}
.atr-avatar img{width:100%;height:100%;border-radius:var(--radius-full);object-fit:cover;}
.atr-avatar--sm{width:1.5rem;height:1.5rem;font-size:var(--text-micro);}
.atr-avatar--md{width:2rem;height:2rem;font-size:var(--text-caption);}
.atr-avatar--lg{width:2.5rem;height:2.5rem;font-size:var(--text-body);}
.atr-avatar__presence{position:absolute;right:-1px;bottom:-1px;width:.6em;height:.6em;
  border-radius:var(--radius-full);box-shadow:0 0 0 2px var(--bg-surface);}
.atr-avatar__presence--online{background:var(--status-positive-ink);}
.atr-avatar__presence--away{background:var(--status-caution-ink);}
.atr-avatar__presence--busy{background:var(--status-critical-ink);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-avatar')) {
  const el = document.createElement('style');
  el.id = 'atr-avatar';
  el.textContent = CSS;
  document.head.appendChild(el);
}

function initialsOf(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ name = '', src, size = 'md', presence, className = '', style, ...props }) {
  const cls = ['atr-avatar', `atr-avatar--${size}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} style={style} title={name || undefined} {...props}>
      {src ? <img src={src} alt={name} /> : initialsOf(name)}
      {presence && <span className={`atr-avatar__presence atr-avatar__presence--${presence}`} aria-hidden="true" />}
    </span>
  );
}
