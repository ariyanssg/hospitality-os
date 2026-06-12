import React from 'react';

/** Skeleton — loading placeholder. Should match the final layout so data arrival causes no reflow. */
const CSS = `
.atr-skel{display:block;border-radius:var(--radius-sm);background:var(--bg-sunken);animation:atr-skel-pulse 1.4s ease-in-out infinite;}
@keyframes atr-skel-pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-skel')) {
  const el = document.createElement('style');
  el.id = 'atr-skel';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export function Skeleton({ width, height, radius, className = '', style, ...props }) {
  return (
    <span
      className={['atr-skel', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius, ...style }}
      {...props}
    />
  );
}
