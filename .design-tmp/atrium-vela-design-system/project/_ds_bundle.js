/* @ds-bundle: {"format":3,"namespace":"AtriumVelaDesignSystem_ec9d90","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Kbd","sourcePath":"components/core/Kbd.jsx"},{"name":"Skeleton","sourcePath":"components/core/Skeleton.jsx"},{"name":"MoneyText","sourcePath":"components/data/MoneyText.jsx"},{"name":"PulseBar","sourcePath":"components/data/PulseBar.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"},{"name":"GuestCard","sourcePath":"components/domain/GuestCard.jsx"},{"name":"ReservationStatusBadge","sourcePath":"components/domain/ReservationStatusBadge.jsx"},{"name":"RoomStatusChip","sourcePath":"components/domain/RoomStatusChip.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"a6c9522f47ca","components/core/Badge.jsx":"7b4cae6f1b4c","components/core/Button.jsx":"3e249acf42d8","components/core/Input.jsx":"5b27d3d7f969","components/core/Kbd.jsx":"80c5a2568f3b","components/core/Skeleton.jsx":"8c9390f131fe","components/data/MoneyText.jsx":"eef60d792cd2","components/data/PulseBar.jsx":"8905d0657ce9","components/data/StatTile.jsx":"0048a527a6cc","components/domain/GuestCard.jsx":"08a2c184c481","components/domain/ReservationStatusBadge.jsx":"b394dea69fe0","components/domain/RoomStatusChip.jsx":"ad50b57e0153","concepts/front-desk/app.jsx":"9028444bb135","concepts/front-desk/checkin.jsx":"c07c84234a14","concepts/front-desk/data.js":"1b4632b0b06f","concepts/front-desk/ops.jsx":"c1afbc930af4","concepts/front-desk/rack.jsx":"a5e6a4c20733","concepts/front-desk/shell.jsx":"67f84a26182a","concepts/front-desk/tweaks-panel.jsx":"6591467622ed","concepts/front-desk/views.jsx":"fc2d7f7aeb13","ui_kits/the-desk/app.jsx":"ca1b48664b34","ui_kits/the-desk/data.js":"5ff1d1261a78","ui_kits/the-desk/screens.jsx":"85057a788462","ui_kits/the-desk/shell.jsx":"1de3601f0660"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AtriumVelaDesignSystem_ec9d90 = window.AtriumVelaDesignSystem_ec9d90 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function Avatar({
  name = '',
  src,
  size = 'md',
  presence,
  className = '',
  style,
  ...props
}) {
  const cls = ['atr-avatar', `atr-avatar--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: style,
    title: name || undefined
  }, props), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initialsOf(name), presence && /*#__PURE__*/React.createElement("span", {
    className: `atr-avatar__presence atr-avatar__presence--${presence}`,
    "aria-hidden": "true"
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — Atrium status tag (doc 17 §4). Tone uses the semantic status triplets; color always
 * carries meaning, never decoration. Pill shape, micro caps. Use `dot` for a leading status dot.
 */
const CSS = `
.atr-badge{
  display:inline-flex;align-items:center;gap:var(--gap-xs);border-radius:var(--radius-full);
  border:1px solid transparent;padding:1px var(--space-2);font-family:var(--font-ui);
  font-size:var(--text-micro);font-weight:500;text-transform:uppercase;letter-spacing:.04em;
  white-space:nowrap;line-height:1.4;
}
.atr-badge__dot{width:.45em;height:.45em;border-radius:var(--radius-full);background:currentColor;}
.atr-badge--neutral{background:var(--status-neutral-bg);color:var(--status-neutral-ink);border-color:var(--status-neutral-line);}
.atr-badge--positive{background:var(--status-positive-bg);color:var(--status-positive-ink);border-color:var(--status-positive-line);}
.atr-badge--caution{background:var(--status-caution-bg);color:var(--status-caution-ink);border-color:var(--status-caution-line);}
.atr-badge--critical{background:var(--status-critical-bg);color:var(--status-critical-ink);border-color:var(--status-critical-line);}
.atr-badge--info{background:var(--status-info-bg);color:var(--status-info-ink);border-color:var(--status-info-line);}
.atr-badge--accent{background:var(--interactive-selected);color:var(--ink-accent);border-color:transparent;}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-badge')) {
  const el = document.createElement('style');
  el.id = 'atr-badge';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className = '',
  ...props
}) {
  const cls = ['atr-badge', `atr-badge--${tone}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, props), dot && /*#__PURE__*/React.createElement("span", {
    className: "atr-badge__dot",
    "aria-hidden": "true"
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  forwardRef
} = React;
/**
 * Button — Atrium Tier-A primitive (doc 17 §4). 5 variants × 3 sizes × loading/disabled.
 * Color usage law: only `primary` uses the accent — one primary action per view region.
 * Styling is pure CSS custom properties so the button re-themes (light/dark) and re-densifies
 * (comfortable/compact/touch) with zero JS.
 */
const CSS = `
.atr-btn{
  --_h: var(--control-h);
  display:inline-flex;align-items:center;justify-content:center;gap:var(--gap-sm);
  white-space:nowrap;border-radius:var(--radius-md);font-family:var(--font-ui);font-weight:500;
  height:var(--_h);padding:0 var(--space-4);font-size:var(--font-size-ui);line-height:1;
  border:1px solid transparent;cursor:pointer;user-select:none;
  transition:background var(--motion-fast) var(--ease-standard),
             color var(--motion-fast) var(--ease-standard),
             border-color var(--motion-fast) var(--ease-standard), opacity var(--motion-fast);
}
.atr-btn:focus-visible{outline:2px solid var(--line-focus);outline-offset:2px;}
.atr-btn:disabled{pointer-events:none;opacity:.5;}
.atr-btn--sm{height:2rem;padding:0 var(--space-3);font-size:var(--text-caption);}
.atr-btn--lg{height:2.75rem;padding:0 var(--space-6);font-size:var(--text-body-lg);}
.atr-btn--primary{background:var(--interactive-default);color:var(--ink-inverse);}
.atr-btn--primary:hover{background:var(--interactive-hover);}
.atr-btn--primary:active{background:var(--interactive-active);}
.atr-btn--secondary{background:var(--bg-surface);color:var(--ink-primary);border-color:var(--line-strong);}
.atr-btn--secondary:hover{background:var(--bg-sunken);}
.atr-btn--ghost{background:transparent;color:var(--ink-secondary);}
.atr-btn--ghost:hover{background:var(--bg-sunken);color:var(--ink-primary);}
.atr-btn--danger{background:var(--status-critical-ink);color:var(--ink-inverse);}
.atr-btn--danger:hover{opacity:.9;}
.atr-btn--danger:active{opacity:.8;}
.atr-btn--link{background:transparent;color:var(--ink-accent);height:auto;padding:0;border:0;text-underline-offset:4px;}
.atr-btn--link:hover{text-decoration:underline;}
.atr-btn__spin{width:1em;height:1em;animation:atr-spin .7s linear infinite;}
@keyframes atr-spin{to{transform:rotate(360deg);}}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-button')) {
  const el = document.createElement('style');
  el.id = 'atr-button';
  el.textContent = CSS;
  document.head.appendChild(el);
}
const Spinner = () => /*#__PURE__*/React.createElement("svg", {
  className: "atr-btn__spin",
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "12",
  cy: "12",
  r: "9",
  stroke: "currentColor",
  strokeWidth: "2.5",
  opacity: "0.25"
}), /*#__PURE__*/React.createElement("path", {
  d: "M21 12a9 9 0 0 0-9-9",
  stroke: "currentColor",
  strokeWidth: "2.5",
  strokeLinecap: "round"
}));
const Button = forwardRef(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  style,
  ...props
}, ref) {
  const cls = ['atr-btn', `atr-btn--${variant}`, size !== 'md' && `atr-btn--${size}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    ref: ref,
    className: cls,
    style: style,
    disabled: disabled ?? loading,
    "aria-busy": loading || undefined
  }, props), loading && /*#__PURE__*/React.createElement(Spinner, null), children);
});
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  forwardRef
} = React;
/**
 * Input — Atrium Tier-A text field (doc 17 §4). Height follows the density tokens; focus ring uses
 * the accent. `invalid` flips the border to critical for inline server-error mapping.
 */
const CSS = `
.atr-input{
  display:flex;width:100%;height:var(--control-h);border-radius:var(--radius-md);
  border:1px solid var(--line-strong);background:var(--bg-surface);
  padding:0 var(--cell-px);font-family:var(--font-ui);font-size:var(--font-size-ui);
  color:var(--ink-primary);transition:border-color var(--motion-fast),box-shadow var(--motion-fast);
}
.atr-input::placeholder{color:var(--ink-tertiary);}
.atr-input:focus-visible{outline:2px solid var(--line-focus);outline-offset:2px;border-color:var(--line-focus);}
.atr-input:disabled{cursor:not-allowed;opacity:.5;}
.atr-input[aria-invalid="true"]{border-color:var(--status-critical-line);}
.atr-input[aria-invalid="true"]:focus-visible{outline-color:var(--status-critical-ink);}
.atr-input--mono{font-family:var(--font-mono);font-variant-numeric:tabular-nums;}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-input')) {
  const el = document.createElement('style');
  el.id = 'atr-input';
  el.textContent = CSS;
  document.head.appendChild(el);
}
const Input = forwardRef(function Input({
  type = 'text',
  invalid = false,
  mono = false,
  className = '',
  ...props
}, ref) {
  const cls = ['atr-input', mono && 'atr-input--mono', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    type: type,
    className: cls,
    "aria-invalid": invalid || undefined
  }, props));
});
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Kbd.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Kbd — keyboard hint chip. The Desk is keyboard-first, so shortcuts surface everywhere. */
const CSS = `
.atr-kbd{
  display:inline-flex;align-items:center;justify-content:center;height:1.25rem;min-width:1.25rem;
  padding:0 .25rem;border-radius:var(--radius-xs);border:1px solid var(--line-strong);
  background:var(--bg-sunken);font-family:var(--font-mono);font-size:var(--text-micro);
  color:var(--ink-secondary);line-height:1;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-kbd')) {
  const el = document.createElement('style');
  el.id = 'atr-kbd';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Kbd({
  children,
  className = '',
  ...props
}) {
  return /*#__PURE__*/React.createElement("kbd", _extends({
    className: ['atr-kbd', className].filter(Boolean).join(' ')
  }, props), children);
}
Object.assign(__ds_scope, { Kbd });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Kbd.jsx", error: String((e && e.message) || e) }); }

// components/core/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Skeleton({
  width,
  height,
  radius,
  className = '',
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['atr-skel', className].filter(Boolean).join(' '),
    style: {
      width,
      height,
      borderRadius: radius,
      ...style
    }
  }, props));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/data/MoneyText.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MoneyText — locale formatting over string-safe money (doc 17 §4). Money is never a float: amounts
 * arrive as decimal strings. Negative (refunds/credits) render in the refund hue. Mono + tabular so
 * columns align to the decimal.
 */
const CSS = `
.atr-money{font-family:var(--font-mono);font-variant-numeric:tabular-nums;white-space:nowrap;}
.atr-money--neg{color:var(--fin-refund);}
.atr-money--pos{color:var(--ink-primary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-money')) {
  const el = document.createElement('style');
  el.id = 'atr-money';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function MoneyText({
  amount,
  currency = 'USD',
  signed = false,
  className = '',
  style,
  ...props
}) {
  const n = Number(amount);
  const negative = n < 0;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(Math.abs(n));
  const sign = negative ? '\u2212' : signed ? '+' : '';
  const cls = ['atr-money', negative ? 'atr-money--neg' : 'atr-money--pos', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    "data-numeric": true,
    className: cls,
    style: style
  }, props), sign, formatted);
}
Object.assign(__ds_scope, { MoneyText });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MoneyText.jsx", error: String((e && e.message) || e) }); }

// components/data/PulseBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PulseBar — the signature Desk element (doc 18 §2): a persistent strip of live property vitals.
 * Each chip is a caps label + display numeral, optional delta, optional segmented day-progress
 * meter, and an optional click-through to its board. The "operating system heartbeat".
 */
const CSS = `
.atr-pulse{display:flex;align-items:stretch;gap:var(--gap-lg);overflow-x:auto;
  border-bottom:1px solid var(--line-hairline);background:var(--bg-raised);
  padding:var(--space-3) var(--space-6);}
.atr-pulse__chip{display:flex;flex-direction:column;gap:2px;min-width:fit-content;text-align:left;
  border:0;background:none;border-radius:var(--radius-md);padding:var(--space-1) var(--space-2);font-family:var(--font-ui);}
.atr-pulse__chip--btn{cursor:pointer;transition:background var(--motion-fast);}
.atr-pulse__chip--btn:hover{background:var(--bg-sunken);}
.atr-pulse__label{font-size:var(--text-micro);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-tertiary);}
.atr-pulse__row{display:flex;align-items:baseline;gap:var(--gap-xs);}
.atr-pulse__value{font-family:var(--font-display);font-weight:600;font-size:var(--text-heading);font-variant-numeric:tabular-nums;letter-spacing:-.01em;}
.atr-pulse__delta{font-size:var(--text-caption);font-variant-numeric:tabular-nums;}
.atr-pulse__meter{margin-top:4px;display:block;height:4px;width:100%;overflow:hidden;border-radius:var(--radius-full);background:var(--bg-sunken);}
.atr-pulse__meter span{display:block;height:100%;border-radius:var(--radius-full);background:var(--interactive-default);transition:width var(--motion-slow) var(--ease-standard);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-pulse')) {
  const el = document.createElement('style');
  el.id = 'atr-pulse';
  el.textContent = CSS;
  document.head.appendChild(el);
}
const TONE_INK = {
  default: 'var(--ink-primary)',
  positive: 'var(--status-positive-ink)',
  caution: 'var(--status-caution-ink)',
  critical: 'var(--status-critical-ink)',
  info: 'var(--status-info-ink)'
};
function PulseBar({
  chips = [],
  className = '',
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['atr-pulse', className].filter(Boolean).join(' '),
    style: style,
    role: "status",
    "aria-live": "polite"
  }, props), chips.map(chip => {
    const Tag = chip.onClick ? 'button' : 'div';
    return /*#__PURE__*/React.createElement(Tag, {
      key: chip.id,
      onClick: chip.onClick,
      className: ['atr-pulse__chip', chip.onClick && 'atr-pulse__chip--btn'].filter(Boolean).join(' ')
    }, /*#__PURE__*/React.createElement("span", {
      className: "atr-pulse__label"
    }, chip.label), /*#__PURE__*/React.createElement("span", {
      className: "atr-pulse__row"
    }, /*#__PURE__*/React.createElement("span", {
      "data-numeric": true,
      className: "atr-pulse__value",
      style: {
        color: TONE_INK[chip.tone ?? 'default']
      }
    }, chip.value), chip.delta && /*#__PURE__*/React.createElement("span", {
      className: "atr-pulse__delta",
      style: {
        color: chip.delta.dir === 'up' ? 'var(--status-positive-ink)' : 'var(--status-critical-ink)'
      }
    }, chip.delta.dir === 'up' ? '\u25B2' : '\u25BC', chip.delta.value)), chip.progress !== undefined && /*#__PURE__*/React.createElement("span", {
      className: "atr-pulse__meter"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: `${Math.round(Math.min(1, Math.max(0, chip.progress)) * 100)}%`
      }
    })));
  }));
}
Object.assign(__ds_scope, { PulseBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PulseBar.jsx", error: String((e && e.message) || e) }); }

// components/data/StatTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StatTile (KPITile) — display-numeral metric with optional delta + trend + target band
 * (doc 17 §4 Charts). The signature data-tile: big tabular display numeral, quiet caps label.
 */
const CSS = `
.atr-stat{display:flex;flex-direction:column;gap:var(--gap-xs);padding:var(--space-4);
  border:1px solid var(--line-hairline);border-radius:var(--radius-lg);background:var(--bg-surface);min-width:9rem;}
.atr-stat__label{font-size:var(--text-micro);font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-tertiary);}
.atr-stat__row{display:flex;align-items:baseline;gap:var(--gap-sm);}
.atr-stat__value{font-family:var(--font-display);font-weight:600;font-size:var(--text-display);line-height:1;font-variant-numeric:tabular-nums;letter-spacing:-.02em;}
.atr-stat__delta{font-size:var(--text-caption);font-variant-numeric:tabular-nums;font-weight:500;}
.atr-stat__delta--up{color:var(--status-positive-ink);}
.atr-stat__delta--down{color:var(--status-critical-ink);}
.atr-stat__sub{font-size:var(--text-caption);color:var(--ink-tertiary);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-stat')) {
  const el = document.createElement('style');
  el.id = 'atr-stat';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function StatTile({
  label,
  value,
  delta,
  sub,
  className = '',
  style,
  ...props
}) {
  const cls = ['atr-stat', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    style: style
  }, props), /*#__PURE__*/React.createElement("span", {
    className: "atr-stat__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "atr-stat__row"
  }, /*#__PURE__*/React.createElement("span", {
    "data-numeric": true,
    className: "atr-stat__value"
  }, value), delta && /*#__PURE__*/React.createElement("span", {
    className: `atr-stat__delta atr-stat__delta--${delta.dir}`
  }, delta.dir === 'up' ? '\u25B2' : '\u25BC', delta.value)), sub && /*#__PURE__*/React.createElement("span", {
    className: "atr-stat__sub"
  }, sub));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/domain/GuestCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * GuestCard — the row-expand / drawer identity card (doc 18 §3.2): photo/initials, VIP, stay
 * summary, traits ("3rd stay \u00B7 prefers high floor \u00B7 allergy: nuts"), and an LTV chip.
 * A Tier-C domain component — composes the primitives, never re-implements them.
 */
const CSS = `
.atr-guest{display:flex;flex-direction:column;gap:var(--gap-md);padding:var(--space-4);
  border:1px solid var(--line-hairline);border-radius:var(--radius-lg);background:var(--bg-surface);font-family:var(--font-ui);}
.atr-guest__head{display:flex;align-items:center;gap:var(--gap-md);}
.atr-guest__name{display:flex;align-items:center;gap:var(--gap-sm);font-weight:600;color:var(--ink-primary);}
.atr-guest__meta{font-size:var(--text-caption);color:var(--ink-tertiary);}
.atr-guest__ltv{margin-left:auto;text-align:right;}
.atr-guest__ltv-label{font-size:var(--text-micro);text-transform:uppercase;letter-spacing:.05em;color:var(--ink-tertiary);}
.atr-guest__traits{display:flex;flex-wrap:wrap;gap:var(--gap-xs);}
.atr-guest__trait{font-size:var(--text-caption);color:var(--ink-secondary);background:var(--bg-sunken);
  border:1px solid var(--line-hairline);border-radius:var(--radius-full);padding:1px var(--space-2);white-space:nowrap;}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-guest')) {
  const el = document.createElement('style');
  el.id = 'atr-guest';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function GuestCard({
  name,
  photo,
  vip = false,
  summary,
  traits = [],
  ltv,
  currency = 'USD',
  className = '',
  style,
  ...props
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['atr-guest', className].filter(Boolean).join(' '),
    style: style
  }, props), /*#__PURE__*/React.createElement("div", {
    className: "atr-guest__head"
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    src: photo,
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "atr-guest__name"
  }, name, vip && /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    tone: "accent"
  }, "VIP")), summary && /*#__PURE__*/React.createElement("div", {
    className: "atr-guest__meta"
  }, summary)), ltv !== undefined && ltv !== null && /*#__PURE__*/React.createElement("div", {
    className: "atr-guest__ltv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "atr-guest__ltv-label"
  }, "Lifetime value"), /*#__PURE__*/React.createElement(__ds_scope.MoneyText, {
    amount: ltv,
    currency: currency
  }))), traits.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "atr-guest__traits"
  }, traits.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "atr-guest__trait"
  }, t))));
}
Object.assign(__ds_scope, { GuestCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/GuestCard.jsx", error: String((e && e.message) || e) }); }

// components/domain/ReservationStatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ReservationStatusBadge — reservation status → consistent label + tone (doc 17 Tier-C). Status
 * colors are sacred; every surface shows the same word for the same state.
 */
const MAP = {
  inquiry: {
    label: 'Inquiry',
    tone: 'neutral'
  },
  tentative: {
    label: 'Tentative',
    tone: 'caution'
  },
  confirmed: {
    label: 'Confirmed',
    tone: 'info'
  },
  checked_in: {
    label: 'In-house',
    tone: 'positive'
  },
  checked_out: {
    label: 'Departed',
    tone: 'neutral'
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'critical'
  },
  no_show: {
    label: 'No-show',
    tone: 'critical'
  },
  released: {
    label: 'Released',
    tone: 'neutral'
  }
};
function ReservationStatusBadge({
  status,
  ...props
}) {
  const s = MAP[status] ?? {
    label: status,
    tone: 'neutral'
  };
  return /*#__PURE__*/React.createElement(__ds_scope.Badge, _extends({
    tone: s.tone
  }, props), s.label);
}
Object.assign(__ds_scope, { ReservationStatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/ReservationStatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/domain/RoomStatusChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * RoomStatusChip — the room-status colors are sacred (doc 17 §3): identical across rack, boards,
 * mobile, reports. Pairs a color dot with a label (color-never-alone, accessibility). The legend is
 * learned once and trusted everywhere.
 */
const LABELS = {
  'vacant-clean': 'Vacant \u00B7 Clean',
  'vacant-dirty': 'Vacant \u00B7 Dirty',
  occupied: 'Occupied',
  inspected: 'Inspected',
  ooo: 'Out of order',
  oos: 'Out of service',
  arrival: 'Arrival',
  departure: 'Departure'
};
const CSS = `
.atr-room{display:inline-flex;align-items:center;gap:var(--gap-xs);font-family:var(--font-ui);
  font-size:var(--text-caption);color:var(--ink-secondary);}
.atr-room__dot{width:.625rem;height:.625rem;border-radius:var(--radius-full);flex:none;}
.atr-room--solid{padding:2px var(--space-2);border-radius:var(--radius-full);
  background:var(--bg-sunken);border:1px solid var(--line-hairline);}
`;
if (typeof document !== 'undefined' && !document.getElementById('atr-room')) {
  const el = document.createElement('style');
  el.id = 'atr-room';
  el.textContent = CSS;
  document.head.appendChild(el);
}
function RoomStatusChip({
  state,
  label,
  chip = false,
  className = '',
  ...props
}) {
  const cls = ['atr-room', chip && 'atr-room--solid', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, props), /*#__PURE__*/React.createElement("span", {
    className: "atr-room__dot",
    style: {
      background: `var(--room-${state})`
    },
    "aria-hidden": "true"
  }), label ?? LABELS[state] ?? state);
}
Object.assign(__ds_scope, { RoomStatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/domain/RoomStatusChip.jsx", error: String((e && e.message) || e) }); }

// concepts/front-desk/app.jsx
try { (() => {
/* The Desk — Concept · root app: tweakable layout/theme/accent, routing, live events. */
(function () {
  const DS = window.AtriumVelaDesignSystem_ec9d90;
  const SH = window.FD_Shell;
  const {
    TodayView,
    ArrivalsView
  } = window.FD_Views;
  const {
    RackView
  } = window.FD_Rack;
  const {
    CheckinDrawer
  } = window.FD_Checkin;
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
  } /*EDITMODE-END*/;

  /* Curated accents — one confident hue at a time (color usage law). */
  const ACCENTS = {
    '#2C6FD6': {
      name: 'Azure',
      h: 251,
      cMul: 1
    },
    '#7A5AE0': {
      name: 'Violet',
      h: 290,
      cMul: 1.05
    },
    '#0F8A96': {
      name: 'Lagoon',
      h: 200,
      cMul: 0.85
    },
    '#4A5160': {
      name: 'Ink',
      h: 260,
      cMul: 0.16
    }
  };
  const RAMP = [[50, 97, .02], [100, 93, .04], [200, 87, .07], [300, 79, .10], [400, 70, .13], [500, 62, .155], [600, 55, .16], [700, 48, .15], [800, 40, .12], [900, 33, .09], [950, 25, .06]];
  function applyAccent(hex) {
    const a = ACCENTS[hex] || ACCENTS['#2C6FD6'];
    const vars = RAMP.map(([s, l, c]) => `--accent-${s}: oklch(${l}% ${(c * a.cMul).toFixed(3)} ${a.h});`).join('\n');
    let el = document.getElementById('fd-accent');
    if (!el) {
      el = document.createElement('style');
      el.id = 'fd-accent';
      document.head.appendChild(el);
    }
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
    R.useEffect(() => {
      document.documentElement.classList.toggle('dark', !!t.dark);
    }, [t.dark]);
    R.useEffect(() => {
      applyAccent(t.accent);
    }, [t.accent]);

    /* ⌘K global */
    R.useEffect(() => {
      const onKey = e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setKOpen(o => !o);
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, []);
    const showToast = tt => {
      setToast(tt);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4200);
    };

    /* Live events — the zero-refresh thesis made visible (tweakable). */
    R.useEffect(() => {
      if (!t.liveEvents) return;
      const t1 = setTimeout(() => {
        setArrivals(list => list.some(a => a.id === D.liveBooking.id) ? list : [...list, D.liveBooking]);
        setNewIds(new Set([D.liveBooking.id]));
        showToast({
          icon: 'zap',
          tone: 'info',
          text: 'New booking — Booking.com · Hoffmann, King Ocean View, 2N'
        });
        setTimeout(() => setNewIds(new Set()), 2200);
      }, 9000);
      const t2 = setTimeout(() => {
        showToast({
          icon: 'utensils',
          tone: 'info',
          text: 'POS — dinner ($112.40) posted to folio · room 405, mid-meal'
        });
      }, 21000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }, [t.liveEvents]);
    const toggleCheck = (ids, replace) => {
      setChecked(prev => {
        if (replace) return new Set(ids);
        const next = new Set(prev);
        ids.forEach(id => next.has(id) ? next.delete(id) : next.add(id));
        return next;
      });
    };
    const autoAssign = ids => {
      const pool = ['415', '201', '512', '202'];
      let i = 0;
      setArrivals(list => list.map(a => ids.includes(a.id) && !a.room ? {
        ...a,
        room: pool[i++ % pool.length],
        inspected: true
      } : a));
      setChecked(new Set());
      showToast({
        icon: 'wand-sparkles',
        text: 'Rooms assigned — gap-optimized, preferences matched',
        undo: true
      });
    };
    const completeCheckin = (id, room) => {
      setArrivals(list => list.map(a => a.id === id ? {
        ...a,
        status: 'checked_in',
        room,
        inspected: true,
        paid: true,
        regcard: true,
        key: true,
        balance: '0.00'
      } : a));
      const res = arrivals.find(a => a.id === id);
      if (res) {
        setStays(s => s.map(st => st.guest === res.last && st.kind === 'arrival' ? {
          ...st,
          kind: 'inhouse',
          room
        } : st));
      }
      setOpenId(null);
      showToast({
        icon: 'log-in',
        text: (res ? res.first + ' ' + res.last : 'Guest') + ' checked in — room ' + room,
        undo: true
      });
    };

    /* Queue-room loop: bump → attendant pinged → room flips inspected → desk + guest notified. */
    const bumpRoom = room => {
      setBumped(prev => new Set([...prev, room]));
      showToast({
        icon: 'bell-ring',
        tone: 'info',
        text: 'Room ' + room + ' bumped — attendant\u2019s phone pinged'
      });
      setTimeout(() => {
        setHk(list => list.map(h => h.room === room ? {
          ...h,
          state: 'inspected',
          eta: 'done'
        } : h));
        showToast({
          icon: 'circle-check',
          text: 'Room ' + room + ' inspected — desk notified · guest SMS sent'
        });
      }, 6000);
    };
    const completeCheckout = id => {
      setDepDone(prev => new Set([...prev, id]));
      setDepOpen(null);
      const d = D.departures.find(x => x.id === id);
      showToast({
        icon: 'door-open',
        text: (d ? d.last : 'Guest') + ' departed — invoice emailed, room ' + (d ? d.room : '') + ' to housekeeping',
        undo: true
      });
    };
    const openRes = arrivals.find(a => a.id === openId);
    const onStayClick = stay => {
      const match = arrivals.find(a => a.last === stay.guest && a.status === 'confirmed');
      if (match) setOpenId(match.id);
    };

    /* Pulse vitals */
    const total = arrivals.length;
    const placed = arrivals.filter(a => a.room).length;
    const inHouse = arrivals.filter(a => a.status === 'checked_in').length;
    const pulse = [{
      id: 'occ',
      label: 'Occupancy',
      value: 84 + inHouse + '%',
      delta: {
        dir: 'up',
        value: '4%'
      },
      tone: 'info'
    }, {
      id: 'arr',
      label: 'Arrivals',
      value: total - inHouse,
      progress: total ? (placed + inHouse) / total : 0,
      onClick: () => setRoute('arrivals')
    }, {
      id: 'queue',
      label: 'Unassigned',
      value: total - placed,
      tone: total - placed > 0 ? 'caution' : 'positive'
    }, {
      id: 'dep',
      label: 'Departures',
      value: D.departures.length - depDone.size,
      progress: depDone.size / D.departures.length,
      onClick: () => setRoute('departures')
    }, {
      id: 'hk',
      label: 'HK to inspect',
      value: Math.max(0, 9 - bumped.size),
      tone: 'caution',
      onClick: () => setRoute('housekeeping')
    }, {
      id: 'sync',
      label: 'Channel sync',
      value: '<5s',
      tone: 'positive'
    }, {
      id: 'adr',
      label: 'ADR',
      value: '$241',
      delta: {
        dir: 'up',
        value: '4%'
      },
      tone: 'positive'
    }, {
      id: 'alerts',
      label: 'Alerts',
      value: 2,
      tone: 'critical'
    }];
    const kItems = [{
      id: 'n1',
      group: 'Navigate',
      label: 'Today',
      icon: 'layout-grid',
      hint: 'g t',
      run: () => setRoute('today')
    }, {
      id: 'n2',
      group: 'Navigate',
      label: 'Arrivals board',
      icon: 'calendar-check',
      hint: 'g a',
      run: () => setRoute('arrivals')
    }, {
      id: 'n3',
      group: 'Navigate',
      label: 'Rack',
      icon: 'bed-double',
      hint: 'g r',
      run: () => setRoute('rack')
    }, {
      id: 'n4',
      group: 'Navigate',
      label: 'Departures',
      icon: 'door-open',
      run: () => setRoute('departures')
    }, {
      id: 'n5',
      group: 'Navigate',
      label: 'Housekeeping',
      icon: 'sparkles',
      run: () => setRoute('housekeeping')
    }, {
      id: 'n6',
      group: 'Navigate',
      label: 'Night audit',
      icon: 'moon-star',
      run: () => setRoute('audit')
    }, ...arrivals.filter(a => a.status === 'confirmed').slice(0, 4).map(a => ({
      id: 'g-' + a.id,
      group: 'Guests',
      label: 'Check in ' + a.first + ' ' + a.last,
      icon: 'user-check',
      hint: a.conf,
      run: () => {
        setRoute('arrivals');
        setOpenId(a.id);
      }
    })), {
      id: 'ai1',
      group: 'Ask Vela',
      label: '“show occupancy last 12 months” — renders the chart inline',
      icon: 'sparkles',
      run: () => {}
    }, {
      id: 'a1',
      group: 'Actions',
      label: 'New reservation',
      icon: 'circle-plus',
      run: () => {}
    }, {
      id: 'a2',
      group: 'Actions',
      label: 'Switch to ' + (t.dark ? 'light' : 'dark') + ' mode',
      icon: t.dark ? 'sun' : 'moon',
      run: () => setTweak('dark', !t.dark)
    }];
    const badges = {
      arrivals: total - placed,
      departures: D.departures.length - depDone.size
    };
    const navbar = t.layout !== 'sidebar';
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-shell",
      "data-barshape": t.barShape,
      "data-density": t.density === 'comfortable' ? undefined : t.density
    }, /*#__PURE__*/React.createElement(SH.TopBar, {
      me: D.me,
      property: property,
      properties: D.properties,
      onProperty: setProperty,
      theme: t.dark ? 'dark' : 'light',
      onToggleTheme: () => setTweak('dark', !t.dark),
      density: t.density,
      onDensity: () => setTweak('density', t.density === 'comfortable' ? 'compact' : t.density === 'compact' ? 'touch' : 'comfortable'),
      onOpenK: () => setKOpen(true)
    }), navbar && /*#__PURE__*/React.createElement(SH.NavTabs, {
      route: route,
      onRoute: r => {
        setRoute(r);
        setChecked(new Set());
      },
      badges: badges
    }), /*#__PURE__*/React.createElement("div", {
      className: "fd-body"
    }, !navbar && /*#__PURE__*/React.createElement(SH.Rail, {
      route: route,
      onRoute: r => {
        setRoute(r);
        setChecked(new Set());
      }
    }), /*#__PURE__*/React.createElement("main", {
      className: "fd-main"
    }, /*#__PURE__*/React.createElement(DS.PulseBar, {
      chips: pulse
    }), /*#__PURE__*/React.createElement("div", {
      className: "fd-scroll"
    }, route === 'today' && /*#__PURE__*/React.createElement(TodayView, {
      me: D.me,
      arrivals: arrivals.filter(a => a.status === 'confirmed'),
      ai: D.aiSuggestions,
      channels: D.channels,
      aiOn: !!t.aiPanel,
      onOpen: setOpenId,
      onRoute: setRoute,
      onAssign: id => autoAssign([id]),
      onAct: showToast
    }), route === 'arrivals' && /*#__PURE__*/React.createElement(ArrivalsView, {
      arrivals: arrivals,
      newIds: newIds,
      selected: openId,
      checked: checked,
      onCheck: toggleCheck,
      onOpen: setOpenId
    }), route === 'rack' && /*#__PURE__*/React.createElement(RackView, {
      days: D.days,
      rooms: D.rooms,
      stays: stays,
      ooo: D.ooo,
      onStayClick: onStayClick
    }), route === 'departures' && /*#__PURE__*/React.createElement(OPS.DeparturesView, {
      departures: D.departures,
      done: depDone,
      onOpen: setDepOpen
    }), route === 'inhouse' && /*#__PURE__*/React.createElement(OPS.InHouseView, {
      arrivals: arrivals,
      onToast: showToast
    }), route === 'housekeeping' && /*#__PURE__*/React.createElement(OPS.HousekeepingView, {
      hkQueue: hk,
      bumped: bumped,
      onBump: bumpRoom
    }), route === 'audit' && /*#__PURE__*/React.createElement(OPS.NightAuditView, {
      items: D.nightAudit
    }), route === 'folios' && /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 460,
        margin: '90px auto',
        textAlign: 'center',
        color: 'var(--ink-tertiary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "receipt",
      size: 26
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 14,
        lineHeight: 1.5
      }
    }, "Folio ledgers live on each reservation \u2014 open any guest from ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--ink-secondary)'
      }
    }, "Arrivals"), ",", ' ', /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--ink-secondary)'
      }
    }, "In-house"), " or ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--ink-secondary)'
      }
    }, "Departures"), " to see the running balance, postings and settlement."), /*#__PURE__*/React.createElement(DS.Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setRoute('inhouse')
    }, "Open In-house"))))), /*#__PURE__*/React.createElement(SH.ActionTray, {
      count: checked.size,
      onClear: () => setChecked(new Set()),
      onAssign: () => autoAssign([...checked]),
      onPrereg: () => {
        setChecked(new Set());
        showToast({
          icon: 'clipboard-check',
          text: 'Pre-registration links sent',
          undo: true
        });
      }
    }), /*#__PURE__*/React.createElement(CheckinDrawer, {
      res: openRes && openRes.status === 'confirmed' ? openRes : null,
      suggestions: openRes ? D.roomSuggestions[openRes.rt] : [],
      upsell: D.upsell,
      onClose: () => setOpenId(null),
      onComplete: completeCheckin
    }), /*#__PURE__*/React.createElement(OPS.CheckoutDrawer, {
      dep: D.departures.find(d => d.id === depOpen) || null,
      onClose: () => setDepOpen(null),
      onComplete: completeCheckout
    }), /*#__PURE__*/React.createElement(SH.CommandPalette, {
      open: kOpen,
      onClose: () => setKOpen(false),
      items: kItems
    }), /*#__PURE__*/React.createElement(SH.Toast, {
      toast: toast,
      onUndo: () => setToast(null)
    }), /*#__PURE__*/React.createElement(TweaksPanel, null, /*#__PURE__*/React.createElement(TweakSection, {
      label: "Layout"
    }), /*#__PURE__*/React.createElement(TweakRadio, {
      label: "Navigation",
      value: t.layout,
      options: ['navbar', 'sidebar'],
      onChange: v => setTweak('layout', v)
    }), /*#__PURE__*/React.createElement(TweakRadio, {
      label: "Density",
      value: t.density,
      options: ['comfortable', 'compact', 'touch'],
      onChange: v => setTweak('density', v)
    }), /*#__PURE__*/React.createElement(TweakSection, {
      label: "Theme"
    }), /*#__PURE__*/React.createElement(TweakColor, {
      label: "Accent",
      value: t.accent,
      options: Object.keys(ACCENTS),
      onChange: v => setTweak('accent', v)
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "Dark mode",
      value: !!t.dark,
      onChange: v => setTweak('dark', v)
    }), /*#__PURE__*/React.createElement(TweakSection, {
      label: "Rack"
    }), /*#__PURE__*/React.createElement(TweakRadio, {
      label: "Stay bars",
      value: t.barShape,
      options: ['pill', 'soft'],
      onChange: v => setTweak('barShape', v)
    }), /*#__PURE__*/React.createElement(TweakSection, {
      label: "Demo"
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "Live events",
      value: !!t.liveEvents,
      onChange: v => setTweak('liveEvents', v)
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "AI suggestions",
      value: !!t.aiPanel,
      onChange: v => setTweak('aiPanel', v)
    })));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/app.jsx", error: String((e && e.message) || e) }); }

// concepts/front-desk/checkin.jsx
try { (() => {
/* The Desk — Concept · check-in drawer: Verify → Room → Pay → Done. Keyboard-complete. */
(function () {
  const {
    Button,
    Badge,
    Kbd,
    MoneyText,
    GuestCard
  } = window.AtriumVelaDesignSystem_ec9d90;
  const {
    Icon
  } = window.FD_Shell;
  const {
    useState,
    useEffect
  } = React;
  const STEPS = ['Verify', 'Room', 'Pay', 'Done'];
  function Stepper({
    step
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-steps",
      "aria-label": 'Step ' + (step + 1) + ' of 4'
    }, STEPS.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: s
    }, i > 0 && /*#__PURE__*/React.createElement("span", {
      className: "fd-step__bar"
    }), /*#__PURE__*/React.createElement("span", {
      className: 'fd-step' + (i === step ? ' is-active' : i < step ? ' is-done' : '')
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-step__num"
    }, i < step ? '✓' : i + 1), s))));
  }
  function CheckinDrawer({
    res,
    suggestions,
    upsell,
    onClose,
    onComplete
  }) {
    const [step, setStep] = useState(0);
    const [room, setRoom] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      if (res) {
        setStep(0);
        setRoom(res.room || suggestions[0] && suggestions[0].num);
        setBusy(false);
      }
    }, [res && res.id]);
    useEffect(() => {
      if (!res) return;
      const onKey = e => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter' && step < 3 && e.target.tagName !== 'BUTTON') advance();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    });
    if (!res) return null;
    const up = upsell[res.rt];
    const roomTotal = (Number(res.rate) * res.nights).toFixed(2);
    const tax = (Number(roomTotal) * 0.1).toFixed(2);
    const total = (Number(roomTotal) + Number(tax)).toFixed(2);
    const deposit = res.paid ? total : '0.00';
    const due = (Number(total) - Number(deposit)).toFixed(2);
    const advance = () => {
      if (step === 2) {
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          setStep(3);
        }, 750);
      } else if (step === 3) {
        onComplete(res.id, room);
      } else setStep(s => s + 1);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": 'Check in ' + res.first + ' ' + res.last
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-scrim",
      tabIndex: -1,
      "aria-label": "Close",
      onClick: onClose
    }), /*#__PURE__*/React.createElement("div", {
      className: "fd-drawer__panel"
    }, /*#__PURE__*/React.createElement("header", {
      className: "fd-drawer__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      className: "font-display",
      style: {
        margin: 0,
        fontSize: 17,
        fontWeight: 600
      }
    }, "Check in \u2014 ", res.last, ", ", res.first), /*#__PURE__*/React.createElement("span", {
      className: "font-mono",
      style: {
        fontSize: 11,
        color: 'var(--ink-tertiary)'
      }
    }, res.conf, " \xB7 ", res.roomType, " \xB7 ", res.nights, "N")), /*#__PURE__*/React.createElement(Stepper, {
      step: step
    }), /*#__PURE__*/React.createElement("button", {
      className: "fd-iconbtn",
      onClick: onClose,
      "aria-label": "Park draft and close"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 16
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fd-drawer__body"
    }, step === 0 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 18
      }
    }, /*#__PURE__*/React.createElement(GuestCard, {
      name: res.first + ' ' + res.last,
      vip: res.vip,
      summary: `${res.roomType} · ${res.nights} night${res.nights > 1 ? 's' : ''} · ${res.adults} adult${res.adults > 1 ? 's' : ''}${res.children ? ' · ' + res.children + ' child' : ''}`,
      traits: res.traits,
      ltv: (Number(res.rate) * res.nights * 6).toFixed(2)
    }), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec"
    }, "Identity & registration"), /*#__PURE__*/React.createElement("div", {
      className: "fd-verify"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-flag is-ok"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "scan-line",
      size: 15
    }), " ID scanned \u2014 matches profile"), /*#__PURE__*/React.createElement("span", {
      className: "fd-flag is-ok"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file-pen-line",
      size: 15
    }), " Reg card e-signed on guest phone"), /*#__PURE__*/React.createElement("span", {
      className: 'fd-flag' + (res.paid ? ' is-ok' : '')
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "credit-card",
      size: 15
    }), " ", res.paid ? 'Card on file — verified' : 'Payment pending'), /*#__PURE__*/React.createElement("span", {
      className: "fd-flag is-ok"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "shield-check",
      size: 15
    }), " Consent on record (marketing: no)"))), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, "Mismatches highlight inline \u2014 nothing blocks until payment. ", /*#__PURE__*/React.createElement(Kbd, null, "Enter"), " continues.")), step === 1 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec",
      style: {
        margin: 0
      }
    }, "Suggested rooms \u2014 gap-optimized, preference-matched"), suggestions.map((s, i) => /*#__PURE__*/React.createElement("button", {
      key: s.num,
      className: 'fd-roomopt' + (room === s.num ? ' is-picked' : ''),
      onClick: () => setRoom(s.num)
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-roomopt__num"
    }, s.num), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 13
      }
    }, s.reason), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 11.5,
        color: s.ready ? 'var(--status-positive-ink)' : 'var(--status-caution-ink)'
      }
    }, s.ready ? '✓ Inspected — ready now' : 'Queue — guest notified when ready')), i === 0 && /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, "Suggested"), room === s.num && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 16,
      style: {
        color: 'var(--ink-accent)'
      }
    }))), up && /*#__PURE__*/React.createElement("div", {
      className: "fd-upsell"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-big-up-dash",
      size: 16
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, "Upgrade to ", up.to, " \u2014 ", /*#__PURE__*/React.createElement("b", null, "+", /*#__PURE__*/React.createElement(MoneyText, {
      amount: up.delta,
      style: {
        color: 'inherit'
      }
    }), "/night"), " \xB7 2 left tonight"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm"
    }, "Offer")), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, /*#__PURE__*/React.createElement(Kbd, null, "\u2192"), " cycles alternates on the mini-rack.")), step === 2 && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec",
      style: {
        margin: 0
      }
    }, "Folio preview"), /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger__row"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, "Room ", room, " \u2014 ", res.roomType, " \xD7 ", res.nights, "N"), /*#__PURE__*/React.createElement(MoneyText, {
      amount: roomTotal
    })), /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger__row"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink-secondary)'
      }
    }, "Occupancy tax (10%)"), /*#__PURE__*/React.createElement(MoneyText, {
      amount: tax
    })), res.paid && /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger__row"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink-secondary)'
      }
    }, "Deposit \u2014 Visa \u2022\u202242 (auto-applied)"), /*#__PURE__*/React.createElement(MoneyText, {
      amount: '-' + deposit
    })), /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger__row is-total"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, "Due at desk"), /*#__PURE__*/React.createElement(MoneyText, {
      amount: due
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fd-verify"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-flag is-ok"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "credit-card",
      size: 15
    }), " Incidentals \u2014 $100 auth on card on file"), /*#__PURE__*/React.createElement("span", {
      className: "fd-flag is-ok"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "receipt-text",
      size: 15
    }), " Invoice routes to guest folio")), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, Number(due) === 0 ? 'Nothing to collect — fully settled by deposit.' : 'Tap terminal or use card on file.')), step === 3 && /*#__PURE__*/React.createElement("div", {
      className: "fd-done"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-done__ring"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 30
    })), /*#__PURE__*/React.createElement("h3", {
      className: "font-display",
      style: {
        margin: 0,
        fontSize: 20,
        fontWeight: 600
      }
    }, res.first, " is in-house \u2014 room ", room), /*#__PURE__*/React.createElement("div", {
      className: "fd-done__list"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
      name: "key-round",
      size: 14,
      style: {
        color: 'var(--status-positive-ink)'
      }
    }), " Two keys encoded"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
      name: "message-square",
      size: 14,
      style: {
        color: 'var(--status-positive-ink)'
      }
    }), " Welcome message queued (SMS)"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 14,
      style: {
        color: 'var(--status-positive-ink)'
      }
    }), " Housekeeping sees the occupancy flip")), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, "Audit row written \u2014 actor, before/after, permission."))), /*#__PURE__*/React.createElement("footer", {
      className: "fd-drawer__foot"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, /*#__PURE__*/React.createElement(Kbd, null, "esc"), " parks the draft \u2014 resumable from Needs attention"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), step > 0 && step < 3 && /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      onClick: () => setStep(s => s - 1)
    }, "Back"), /*#__PURE__*/React.createElement(Button, {
      onClick: advance,
      loading: busy
    }, step === 0 ? 'Verified — choose room' : step === 1 ? 'Room ' + (room || '—') + ' — to payment' : step === 2 ? Number(due) === 0 ? 'Complete check-in' : 'Collect & complete' : 'Close', step < 3 && /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    })))));
  }
  window.FD_Checkin = {
    CheckinDrawer
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/checkin.jsx", error: String((e && e.message) || e) }); }

// concepts/front-desk/data.js
try { (() => {
/* The Desk — Concept · demo data. Property "Grand Vela — Ocean Club" (GVOC, USD).
   Dates are computed from the real today so the Rack always reads current. */
window.FD_DATA = function () {
  const DAY = 86400000;
  const t0 = new Date();
  t0.setHours(0, 0, 0, 0);
  const fmtD = d => d.toLocaleDateString('en-US', {
    weekday: 'short'
  }).toUpperCase();
  const days = Array.from({
    length: 14
  }, (_, i) => {
    const d = new Date(t0.getTime() + i * DAY);
    return {
      i,
      iso: d.toISOString().slice(0, 10),
      dow: fmtD(d),
      num: d.getDate(),
      month: d.toLocaleDateString('en-US', {
        month: 'short'
      }),
      weekend: [0, 6].includes(d.getDay())
    };
  });
  const properties = [{
    id: 'gvoc',
    name: 'Grand Vela — Ocean Club',
    code: 'GVOC',
    currency: 'USD'
  }, {
    id: 'gvch',
    name: 'Grand Vela — Cliff House',
    code: 'GVCH',
    currency: 'USD'
  }, {
    id: 'gvla',
    name: 'Grand Vela — Laguna',
    code: 'GVLA',
    currency: 'MXN'
  }];
  const me = {
    name: 'Frankie Doyle',
    email: 'frankie@grand-vela.demo',
    role: 'Front Desk'
  };

  /* Arrivals — readiness facets drive the composite chip; score = facets true. */
  const mk = (id, conf, first, last, rt, roomType, rate, nights, eta, channel, vip, f, traits) => ({
    id,
    conf,
    first,
    last,
    rt,
    roomType,
    rate,
    nights,
    eta,
    channel,
    vip,
    room: f.room || null,
    inspected: !!f.inspected,
    paid: !!f.paid,
    regcard: !!f.regcard,
    key: !!f.key,
    online: f.online || null,
    /* self-service journey: 'done' | 'started' | null */
    status: 'confirmed',
    adults: f.adults || 2,
    children: f.children || 0,
    traits: traits || [],
    balance: f.paid ? '0.00' : (Number(rate) * nights).toFixed(2)
  });
  const arrivals = [mk('a1', 'BK-1042', 'Priya', 'Patel', 'DLX', 'Deluxe Suite', '420.00', 2, '14:00', 'direct', true, {
    room: '515',
    inspected: true,
    paid: true,
    regcard: true,
    key: false,
    children: 1,
    online: 'done'
  }, ['3rd stay', 'prefers high floor', 'allergy: nuts']), mk('a2', 'BK-1031', 'Dana', 'Rivera', 'KING', 'King Ocean View', '240.00', 1, '15:00', 'direct', false, {
    room: '412',
    inspected: true,
    paid: true,
    regcard: true,
    key: true,
    online: 'done'
  }, ['2nd stay', 'high floor']), mk('a3', 'BK-1018', 'Ito', 'Nakamura', 'DLX', 'Deluxe Suite', '420.00', 2, '15:40', 'ota', false, {
    room: null,
    inspected: false,
    paid: true,
    regcard: false,
    key: false,
    adults: 1
  }, ['quiet floor', 'late arrival']), mk('a4', 'BK-1027', 'Marcus', 'Bell', 'KING', 'King Ocean View', '240.00', 1, '16:00', 'ota', false, {
    room: null,
    inspected: false,
    paid: true,
    regcard: true,
    key: false,
    online: 'started'
  }, ['anniversary']), mk('a5', 'BK-1009', 'Sofia', 'Marino', 'DLX', 'Deluxe Suite', '420.00', 3, '13:30', 'corporate', true, {
    room: '518',
    inspected: true,
    paid: true,
    regcard: true,
    key: true,
    adults: 1,
    online: 'done'
  }, ['VIP — repeat', 'champagne on arrival']), mk('a6', 'BK-1056', 'Liam', 'O\u2019Brien', 'STD', 'Standard Queen', '180.00', 3, '17:15', 'ota', false, {
    room: null,
    inspected: false,
    paid: false,
    regcard: false,
    key: false,
    children: 2
  }, ['family', 'connecting rooms']), mk('a7', 'BK-1061', 'Chen', 'Wei', 'KING', 'King Ocean View', '240.00', 2, '12:45', 'corporate', false, {
    room: '410',
    inspected: true,
    paid: true,
    regcard: true,
    key: true,
    adults: 1
  }, ['corporate rate']), mk('a8', 'BK-1063', 'Amara', 'Okafor', 'DLX', 'Deluxe Suite', '420.00', 1, '18:00', 'direct', false, {
    room: '512',
    inspected: false,
    paid: true,
    regcard: false,
    key: false
  }, ['ocean view requested']), mk('a9', 'BK-1070', 'Yusuf', 'Demir', 'STD', 'Standard Queen', '180.00', 2, '19:30', 'group', false, {
    room: '204',
    inspected: true,
    paid: false,
    regcard: false,
    key: false
  }, ['group: Marlin Conf.'])];

  /* The live OTA booking that slides in (zero-refresh thesis). */
  const liveBooking = mk('a10', 'BK-1077', 'Lena', 'Hoffmann', 'KING', 'King Ocean View', '240.00', 2, '20:00', 'ota', false, {
    room: null,
    inspected: false,
    paid: true,
    regcard: false,
    key: false,
    adults: 1,
    online: 'started'
  }, ['booked just now']);

  /* Departures — mirror of arrivals: readiness = folio balanced · no disputes · late-checkout flag.
     Express path: Enter → folio review → settle → emailed invoice. */
  const departures = [{
    id: 'd1',
    conf: 'BK-0961',
    first: 'Camila',
    last: 'Aldana',
    room: '511',
    rt: 'DLX',
    nights: 4,
    due: '11:00',
    balance: '0.00',
    folioOk: true,
    dispute: false,
    late: null,
    method: 'Card on file — settled',
    channel: 'corporate'
  }, {
    id: 'd2',
    conf: 'BK-0948',
    first: 'Piotr',
    last: 'Kowalski',
    room: '206',
    rt: 'STD',
    nights: 4,
    due: '14:00',
    balance: '0.00',
    folioOk: true,
    dispute: false,
    late: 'Late checkout approved — 14:00 (+$40 posted)',
    method: 'Visa ••42 — settled',
    channel: 'direct'
  }, {
    id: 'd3',
    conf: 'BK-0957',
    first: 'Margaux',
    last: 'Fontaine',
    room: '405',
    rt: 'KING',
    nights: 3,
    due: '12:00',
    balance: '86.50',
    folioOk: false,
    dispute: false,
    late: null,
    method: 'Minibar posted 07:40 — collect at desk',
    channel: 'ota'
  }, {
    id: 'd4',
    conf: 'BK-0939',
    first: 'Theo',
    last: 'Laurent',
    room: '309',
    rt: 'KING',
    nights: 2,
    due: '11:00',
    balance: '0.00',
    folioOk: true,
    dispute: true,
    late: null,
    method: 'Chargeback inquiry open — evidence pack ready',
    channel: 'ota'
  }, {
    id: 'd5',
    conf: 'BK-0944',
    first: 'Naledi',
    last: 'Mbeki',
    room: '514',
    rt: 'DLX',
    nights: 5,
    due: '12:00',
    balance: '1240.00',
    folioOk: false,
    dispute: false,
    late: null,
    method: 'Direct bill → Marlin Corp (AR transfer)',
    channel: 'corporate'
  }];

  /* Housekeeping — room-ready queue prioritized by imminent arrival. */
  const hkQueue = [{
    room: '512',
    rt: 'DLX',
    state: 'vacant-dirty',
    assignee: 'Rosa M.',
    eta: '25m',
    arrival: 'Okafor · 18:00',
    priority: true
  }, {
    room: '202',
    rt: 'STD',
    state: 'vacant-dirty',
    assignee: 'Daniel K.',
    eta: '30m',
    arrival: 'O’Brien · 17:15',
    priority: true
  }, {
    room: '415',
    rt: 'KING',
    state: 'vacant-dirty',
    assignee: '— unassigned',
    eta: '—',
    arrival: 'Nakamura · 15:40',
    priority: true
  }, {
    room: '511',
    rt: 'DLX',
    state: 'vacant-dirty',
    assignee: 'Rosa M.',
    eta: 'after 512',
    arrival: 'Brandt · Sat',
    priority: false
  }, {
    room: '201',
    rt: 'STD',
    state: 'vacant-clean',
    assignee: 'inspect — Daniel K.',
    eta: '15m',
    arrival: 'Hoffmann · 20:00',
    priority: false
  }, {
    room: '304',
    rt: 'KING',
    state: 'ooo',
    assignee: 'Engineering',
    eta: 'Fri',
    arrival: 'blocked — plumbing',
    priority: false
  }];

  /* AI layer — assistive, approve-before-publish (high-confidence, workflow-adjacent only). */
  const aiSuggestions = [{
    id: 'ai1',
    kind: 'pricing',
    icon: 'trending-up',
    confidence: '87%',
    title: 'Raise KING BAR +8% Fri–Sat',
    body: 'City event detected · forecast occupancy 92% · comp set trending +6%. Publishes to all channels on approval.',
    actions: ['Approve & publish', 'Simulate']
  }, {
    id: 'ai2',
    kind: 'upsell',
    icon: 'arrow-big-up-dash',
    confidence: '3 ranked',
    title: 'Upgrade offers likely to convert',
    body: 'Patel (DLX→520 corner), Bell (anniversary — KING high floor), Hoffmann (booked entry rate). Offers surface in their check-in flow.',
    actions: ['Queue offers']
  }, {
    id: 'ai3',
    kind: 'anomaly',
    icon: 'siren',
    confidence: 'new',
    title: 'F&B voids +18% vs 4-week trend',
    body: 'Concentrated in POS shift 2 (Tue–Wed). Pattern matches training-gap, not leakage.',
    actions: ['Open report']
  }, {
    id: 'ai4',
    kind: 'recon',
    icon: 'git-compare-arrows',
    confidence: '2 items',
    title: 'Gateway captures unmatched',
    body: 'Two captures ( $240.00, $86.50 ) have no posting match. Auto-match suggestions ready for review.',
    actions: ['Review matches']
  }];

  /* Distribution / channel health — zero-lag thesis, observable. */
  const channels = [{
    name: 'Booking.com',
    ok: true,
    lag: '4s',
    note: 'parity OK'
  }, {
    name: 'Expedia',
    ok: false,
    lag: '9s',
    note: 'rate-map warning · DLX'
  }, {
    name: 'GDS',
    ok: true,
    lag: '11s',
    note: 'parity OK'
  }, {
    name: 'Booking engine',
    ok: true,
    lag: '<1s',
    note: 'direct'
  }];

  /* Night audit — the 90-second ritual. */
  const nightAudit = [{
    id: 'na1',
    label: 'No-show processing',
    detail: '1 candidate (BK-1071 · guaranteed) — fee rule: 1 night',
    state: 'ready'
  }, {
    id: 'na2',
    label: 'Unposted room & tax',
    detail: '62 in-house rooms — auto-post on close',
    state: 'ready'
  }, {
    id: 'na3',
    label: 'Open folios with credit limit breach',
    detail: 'None',
    state: 'done'
  }, {
    id: 'na4',
    label: 'Cashier sessions',
    detail: 'Frankie D. open — count & close before audit',
    state: 'blocked'
  }, {
    id: 'na5',
    label: 'Gateway batch settlement',
    detail: '41 captures queued · est. 90s',
    state: 'ready'
  }, {
    id: 'na6',
    label: 'Business date roll → trial balance',
    detail: 'Ledger ties by construction — report emails to GM',
    state: 'ready'
  }];

  /* Rack — 14 rooms × 14 days. state drives the left-rail dot; stays render as bars.
     kind: inhouse | arrival | future | departure  (maps to bar styling) */
  const rooms = [{
    num: '201',
    rt: 'STD',
    state: 'vacant-clean'
  }, {
    num: '202',
    rt: 'STD',
    state: 'vacant-dirty'
  }, {
    num: '204',
    rt: 'STD',
    state: 'inspected'
  }, {
    num: '206',
    rt: 'STD',
    state: 'occupied'
  }, {
    num: '304',
    rt: 'KING',
    state: 'ooo'
  }, {
    num: '405',
    rt: 'KING',
    state: 'occupied'
  }, {
    num: '410',
    rt: 'KING',
    state: 'inspected'
  }, {
    num: '412',
    rt: 'KING',
    state: 'inspected'
  }, {
    num: '415',
    rt: 'KING',
    state: 'vacant-dirty'
  }, {
    num: '511',
    rt: 'DLX',
    state: 'occupied'
  }, {
    num: '512',
    rt: 'DLX',
    state: 'vacant-dirty'
  }, {
    num: '515',
    rt: 'DLX',
    state: 'inspected'
  }, {
    num: '518',
    rt: 'DLX',
    state: 'inspected'
  }, {
    num: '520',
    rt: 'DLX',
    state: 'vacant-clean'
  }];
  const stays = [{
    id: 's1',
    room: '206',
    start: -2,
    nights: 4,
    guest: 'Kowalski',
    channel: 'direct',
    kind: 'inhouse',
    rate: '180.00'
  }, {
    id: 's2',
    room: '405',
    start: -1,
    nights: 3,
    guest: 'Fontaine',
    channel: 'ota',
    kind: 'inhouse',
    rate: '240.00'
  }, {
    id: 's3',
    room: '511',
    start: -3,
    nights: 4,
    guest: 'Aldana',
    channel: 'corporate',
    kind: 'departure',
    rate: '420.00'
  }, {
    id: 's4',
    room: '412',
    start: 0,
    nights: 1,
    guest: 'Rivera',
    channel: 'direct',
    kind: 'arrival',
    rate: '240.00'
  }, {
    id: 's5',
    room: '515',
    start: 0,
    nights: 2,
    guest: 'Patel',
    channel: 'direct',
    kind: 'arrival',
    rate: '420.00'
  }, {
    id: 's6',
    room: '518',
    start: 0,
    nights: 3,
    guest: 'Marino',
    channel: 'corporate',
    kind: 'arrival',
    rate: '420.00'
  }, {
    id: 's7',
    room: '410',
    start: 0,
    nights: 2,
    guest: 'Wei',
    channel: 'corporate',
    kind: 'arrival',
    rate: '240.00'
  }, {
    id: 's8',
    room: '204',
    start: 0,
    nights: 2,
    guest: 'Demir',
    channel: 'group',
    kind: 'arrival',
    rate: '180.00'
  }, {
    id: 's9',
    room: '512',
    start: 0,
    nights: 1,
    guest: 'Okafor',
    channel: 'direct',
    kind: 'arrival',
    rate: '420.00'
  }, {
    id: 's10',
    room: '201',
    start: 2,
    nights: 3,
    guest: 'Svensson',
    channel: 'ota',
    kind: 'future',
    rate: '180.00'
  }, {
    id: 's11',
    room: '415',
    start: 3,
    nights: 4,
    guest: 'Moreau',
    channel: 'direct',
    kind: 'future',
    rate: '240.00'
  }, {
    id: 's12',
    room: '520',
    start: 1,
    nights: 2,
    guest: 'Tanaka',
    channel: 'ota',
    kind: 'future',
    rate: '420.00'
  }, {
    id: 's13',
    room: '202',
    start: 4,
    nights: 2,
    guest: 'Iyer',
    channel: 'corporate',
    kind: 'future',
    rate: '180.00'
  }, {
    id: 's14',
    room: '206',
    start: 5,
    nights: 3,
    guest: 'Walsh',
    channel: 'direct',
    kind: 'future',
    rate: '180.00'
  }, {
    id: 's15',
    room: '511',
    start: 2,
    nights: 4,
    guest: 'Brandt',
    channel: 'group',
    kind: 'future',
    rate: '420.00'
  }, {
    id: 's16',
    room: '405',
    start: 6,
    nights: 2,
    guest: 'Costa',
    channel: 'ota',
    kind: 'future',
    rate: '240.00'
  }, {
    id: 's17',
    room: '412',
    start: 3,
    nights: 3,
    guest: 'N\u2019Diaye',
    channel: 'direct',
    kind: 'future',
    rate: '240.00'
  }];
  const ooo = [{
    room: '304',
    start: 0,
    nights: 6,
    reason: 'Plumbing — ETA Fri'
  }];

  /* Suggested + alternate rooms for the check-in flow. */
  const roomSuggestions = {
    DLX: [{
      num: '512',
      reason: 'high floor · inspected 13:05 · matches preference',
      ready: true
    }, {
      num: '520',
      reason: 'corner suite · vacant clean',
      ready: true
    }, {
      num: '511',
      reason: 'departs 11:00 — queue for 14:30',
      ready: false
    }],
    KING: [{
      num: '412',
      reason: 'high floor · inspected 12:40',
      ready: true
    }, {
      num: '415',
      reason: 'ocean side — HK in progress',
      ready: false
    }, {
      num: '410',
      reason: 'inspected 11:55',
      ready: true
    }],
    STD: [{
      num: '204',
      reason: 'inspected 12:10 · near elevator',
      ready: true
    }, {
      num: '201',
      reason: 'vacant clean',
      ready: true
    }, {
      num: '202',
      reason: 'HK in progress — ETA 30m',
      ready: false
    }]
  };
  const upsell = {
    DLX: null,
    KING: {
      to: 'Deluxe Suite',
      delta: '84.00'
    },
    STD: {
      to: 'King Ocean View',
      delta: '60.00'
    }
  };
  return {
    days,
    properties,
    me,
    arrivals,
    liveBooking,
    rooms,
    stays,
    ooo,
    roomSuggestions,
    upsell,
    departures,
    hkQueue,
    aiSuggestions,
    channels,
    nightAudit
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/data.js", error: String((e && e.message) || e) }); }

// concepts/front-desk/ops.jsx
try { (() => {
/* The Desk — Concept · operational views: Departures (+ express checkout), In-house,
   Housekeeping room-ready queue, Night audit checklist. */
(function () {
  const {
    Badge,
    Button,
    Kbd,
    MoneyText,
    RoomStatusChip,
    Avatar
  } = window.AtriumVelaDesignSystem_ec9d90;
  const {
    Icon
  } = window.FD_Shell;
  const {
    useState,
    useEffect
  } = React;

  /* ── Departures board — readiness = folio balanced · no disputes · late flag ── */
  function depState(d) {
    if (d.dispute) return {
      tone: 'critical',
      label: 'Dispute open',
      icon: 'shield-alert'
    };
    if (Number(d.balance) > 0 && d.method.includes('Direct bill')) return {
      tone: 'info',
      label: 'AR transfer',
      icon: 'building-2'
    };
    if (Number(d.balance) > 0) return {
      tone: 'caution',
      label: 'Balance due',
      icon: 'credit-card'
    };
    return {
      tone: 'positive',
      label: 'Express ready',
      icon: 'circle-check'
    };
  }
  function DeparturesView({
    departures,
    done,
    onOpen
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-page__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "fd-h1"
    }, "Departures"), /*#__PURE__*/React.createElement("p", {
      className: "fd-sub"
    }, "Express path: ", /*#__PURE__*/React.createElement(Kbd, null, "\u21B5"), " \u2192 folio review \u2192 settle \u2192 emailed invoice. Exceptions route to the record with the blocker pre-focused.")), /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, departures.length - done.size, " remaining \xB7 ", done.size, " departed")), /*#__PURE__*/React.createElement("div", {
      className: "fd-board"
    }, /*#__PURE__*/React.createElement("table", {
      className: "fd-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Due"), /*#__PURE__*/React.createElement("th", null, "Guest"), /*#__PURE__*/React.createElement("th", null, "Room"), /*#__PURE__*/React.createElement("th", null, "Settlement"), /*#__PURE__*/React.createElement("th", null, "Readiness"), /*#__PURE__*/React.createElement("th", {
      style: {
        textAlign: 'right'
      }
    }, "Balance"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, departures.map(d => {
      const s = depState(d);
      const out = done.has(d.id);
      return /*#__PURE__*/React.createElement("tr", {
        key: d.id,
        tabIndex: 0,
        className: 'fd-row' + (out ? ' is-dim' : ''),
        onClick: () => !out && onOpen(d.id),
        onKeyDown: e => {
          if (e.key === 'Enter' && !out) onOpen(d.id);
        }
      }, /*#__PURE__*/React.createElement("td", {
        className: "fd-eta"
      }, d.due), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 500
        }
      }, d.last, ", ", d.first), /*#__PURE__*/React.createElement("span", {
        className: "font-mono",
        style: {
          fontSize: 11,
          color: 'var(--ink-tertiary)'
        }
      }, d.conf)), d.late && /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'block',
          fontSize: 11.5,
          color: 'var(--status-info-ink)'
        }
      }, d.late)), /*#__PURE__*/React.createElement("td", {
        className: "font-mono",
        style: {
          fontSize: 12.5
        }
      }, d.room, " ", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ink-tertiary)'
        }
      }, "\xB7 ", d.rt)), /*#__PURE__*/React.createElement("td", {
        style: {
          fontSize: 12.5,
          color: 'var(--ink-secondary)',
          whiteSpace: 'normal',
          maxWidth: 260
        }
      }, d.method), /*#__PURE__*/React.createElement("td", null, out ? /*#__PURE__*/React.createElement(Badge, {
        tone: "neutral"
      }, "Departed") : /*#__PURE__*/React.createElement(Badge, {
        tone: s.tone,
        dot: true
      }, s.label)), /*#__PURE__*/React.createElement("td", {
        style: {
          textAlign: 'right'
        }
      }, /*#__PURE__*/React.createElement(MoneyText, {
        amount: d.balance
      })), /*#__PURE__*/React.createElement("td", {
        style: {
          textAlign: 'right'
        }
      }, !out && Number(d.balance) === 0 && !d.dispute && /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 11.5,
          color: 'var(--ink-tertiary)'
        }
      }, "\u21B5 express")));
    })))));
  }

  /* ── Express checkout drawer — three keystrokes ── */
  function CheckoutDrawer({
    dep,
    onClose,
    onComplete
  }) {
    const [busy, setBusy] = useState(false);
    const [doneStep, setDoneStep] = useState(false);
    useEffect(() => {
      if (dep) {
        setBusy(false);
        setDoneStep(false);
      }
    }, [dep && dep.id]);
    useEffect(() => {
      if (!dep) return;
      const onKey = e => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    });
    if (!dep) return null;
    const lines = [{
      d: `Room ${dep.room} — ${dep.rt} × ${dep.nights}N`,
      a: (dep.rt === 'DLX' ? 420 : dep.rt === 'KING' ? 240 : 180) * dep.nights
    }, {
      d: 'Occupancy tax (10%)',
      a: (dep.rt === 'DLX' ? 42 : dep.rt === 'KING' ? 24 : 18) * dep.nights
    }];
    if (dep.late) lines.push({
      d: 'Late checkout fee',
      a: 40
    });
    if (Number(dep.balance) > 0 && !dep.method.includes('Direct bill')) lines.push({
      d: 'Minibar — posted 07:40',
      a: Number(dep.balance)
    });
    const gross = lines.reduce((n, l) => n + l.a, 0);
    const settled = gross - Number(dep.balance);
    const settle = () => {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        setDoneStep(true);
      }, 650);
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-drawer",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": 'Check out ' + dep.last
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-scrim",
      tabIndex: -1,
      "aria-label": "Close",
      onClick: onClose
    }), /*#__PURE__*/React.createElement("div", {
      className: "fd-drawer__panel",
      style: {
        width: 500
      }
    }, /*#__PURE__*/React.createElement("header", {
      className: "fd-drawer__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      className: "font-display",
      style: {
        margin: 0,
        fontSize: 17,
        fontWeight: 600
      }
    }, "Check out \u2014 ", dep.last, ", ", dep.first), /*#__PURE__*/React.createElement("span", {
      className: "font-mono",
      style: {
        fontSize: 11,
        color: 'var(--ink-tertiary)'
      }
    }, dep.conf, " \xB7 room ", dep.room, " \xB7 due ", dep.due)), /*#__PURE__*/React.createElement("button", {
      className: "fd-iconbtn",
      onClick: onClose,
      "aria-label": "Close"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 16
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fd-drawer__body"
    }, doneStep ? /*#__PURE__*/React.createElement("div", {
      className: "fd-done"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-done__ring"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 30
    })), /*#__PURE__*/React.createElement("h3", {
      className: "font-display",
      style: {
        margin: 0,
        fontSize: 20,
        fontWeight: 600
      }
    }, "Departed \u2014 folio closed"), /*#__PURE__*/React.createElement("div", {
      className: "fd-done__list"
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
      name: "mail",
      size: 14,
      style: {
        color: 'var(--status-positive-ink)'
      }
    }), " Invoice emailed (", dep.first.toLowerCase(), "@\u2026)"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 14,
      style: {
        color: 'var(--status-positive-ink)'
      }
    }), " Room ", dep.room, " queued for housekeeping"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 14,
      style: {
        color: 'var(--status-positive-ink)'
      }
    }), " Postings immutable \u2014 reversal-only corrections"))) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, dep.dispute && /*#__PURE__*/React.createElement("div", {
      className: "fd-upsell",
      style: {
        borderColor: 'var(--status-critical-line)',
        background: 'var(--status-critical-bg)',
        color: 'var(--status-critical-ink)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "shield-alert",
      size: 16
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, "Chargeback inquiry open \u2014 evidence pack (folio, reg card, signature) is assembled."), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm"
    }, "Open case")), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec"
    }, "Folio review"), /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger"
    }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "fd-ledger__row"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, l.d), /*#__PURE__*/React.createElement(MoneyText, {
      amount: l.a.toFixed(2)
    }))), /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger__row"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink-secondary)'
      }
    }, "Settled to date"), /*#__PURE__*/React.createElement(MoneyText, {
      amount: (-settled).toFixed(2)
    })), /*#__PURE__*/React.createElement("div", {
      className: "fd-ledger__row is-total"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, dep.method.includes('Direct bill') ? 'Transfers to AR' : 'Balance'), /*#__PURE__*/React.createElement(MoneyText, {
      amount: dep.balance
    })))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec"
    }, "Settlement"), /*#__PURE__*/React.createElement("span", {
      className: "fd-flag is-ok",
      style: {
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: dep.method.includes('Direct bill') ? 'building-2' : 'credit-card',
      size: 15
    }), " ", dep.method)))), /*#__PURE__*/React.createElement("footer", {
      className: "fd-drawer__foot"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, /*#__PURE__*/React.createElement(Kbd, null, "esc"), " closes \u2014 nothing is lost"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), doneStep ? /*#__PURE__*/React.createElement(Button, {
      onClick: () => onComplete(dep.id)
    }, "Done") : /*#__PURE__*/React.createElement(Button, {
      onClick: settle,
      loading: busy
    }, Number(dep.balance) > 0 && !dep.method.includes('Direct bill') ? 'Collect & check out' : dep.method.includes('Direct bill') ? 'Transfer to AR & check out' : 'Check out', /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 14
    })))));
  }

  /* ── In-house — folio-first list ── */
  function InHouseView({
    arrivals,
    onOpen,
    onToast
  }) {
    const inhouse = [...arrivals.filter(a => a.status === 'checked_in').map(a => ({
      id: a.id,
      name: a.last + ', ' + a.first,
      room: a.room,
      rt: a.rt,
      vip: a.vip,
      nights: a.nights,
      balance: (Number(a.rate) * 1).toFixed(2),
      note: 'Checked in today',
      live: true
    })), {
      id: 'h1',
      name: 'Kowalski, Piotr',
      room: '206',
      rt: 'STD',
      nights: 4,
      balance: '792.00',
      note: 'Departs tomorrow · late checkout 14:00'
    }, {
      id: 'h2',
      name: 'Fontaine, Margaux',
      room: '405',
      rt: 'KING',
      nights: 3,
      balance: '878.50',
      note: 'POS: dinner posted to folio 19:42'
    }, {
      id: 'h3',
      name: 'Aldana, Camila',
      room: '511',
      rt: 'DLX',
      nights: 4,
      vip: true,
      balance: '0.00',
      note: 'Settled — departs 11:00'
    }];
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-page",
      style: {
        maxWidth: 960,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-page__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "fd-h1"
    }, "In-house"), /*#__PURE__*/React.createElement("p", {
      className: "fd-sub"
    }, "Running folios \u2014 a restaurant check posts here mid-meal, one ACID transaction away."))), /*#__PURE__*/React.createElement("div", {
      className: "fd-board"
    }, /*#__PURE__*/React.createElement("table", {
      className: "fd-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Guest"), /*#__PURE__*/React.createElement("th", null, "Room"), /*#__PURE__*/React.createElement("th", null, "Folio note"), /*#__PURE__*/React.createElement("th", {
      style: {
        textAlign: 'right'
      }
    }, "Balance"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, inhouse.map(g => /*#__PURE__*/React.createElement("tr", {
      key: g.id,
      className: 'fd-row' + (g.live ? ' is-new' : '')
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: g.name.replace(',', ''),
      size: "sm"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, g.name), g.vip && /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, "VIP"))), /*#__PURE__*/React.createElement("td", {
      className: "font-mono",
      style: {
        fontSize: 12.5
      }
    }, g.room, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-tertiary)'
      }
    }, "\xB7 ", g.rt)), /*#__PURE__*/React.createElement("td", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink-secondary)'
      }
    }, g.note), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement(MoneyText, {
      amount: g.balance
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-chip",
      onClick: () => onToast({
        icon: 'receipt-text',
        text: 'Charge posted to ' + g.room + ' — Undo',
        undo: true
      })
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "receipt-text",
      size: 13
    }), " Post charge"))))))));
  }

  /* ── Housekeeping — room-ready queue, prioritized by imminent arrival ── */
  function HousekeepingView({
    hkQueue,
    bumped,
    onBump
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-page",
      style: {
        maxWidth: 960,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-page__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "fd-h1"
    }, "Housekeeping"), /*#__PURE__*/React.createElement("p", {
      className: "fd-sub"
    }, "Room-ready queue \u2014 bumping a room pings the attendant's phone; the desk gets a toast when it inspects.")), /*#__PURE__*/React.createElement(Badge, {
      tone: "caution"
    }, "9 to inspect")), /*#__PURE__*/React.createElement("div", {
      className: "fd-board"
    }, /*#__PURE__*/React.createElement("table", {
      className: "fd-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Room"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Attendant"), /*#__PURE__*/React.createElement("th", null, "ETA"), /*#__PURE__*/React.createElement("th", null, "Next arrival"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, hkQueue.map(h => /*#__PURE__*/React.createElement("tr", {
      key: h.room,
      className: "fd-row"
    }, /*#__PURE__*/React.createElement("td", {
      className: "font-mono",
      style: {
        fontWeight: 600
      }
    }, h.room, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: 'var(--ink-tertiary)'
      }
    }, "\xB7 ", h.rt)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(RoomStatusChip, {
      state: h.state
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink-secondary)'
      }
    }, h.assignee), /*#__PURE__*/React.createElement("td", {
      className: "font-mono",
      style: {
        fontSize: 12
      }
    }, bumped.has(h.room) ? 'next up' : h.eta), /*#__PURE__*/React.createElement("td", {
      style: {
        fontSize: 12.5,
        color: h.priority ? 'var(--status-caution-ink)' : 'var(--ink-tertiary)'
      }
    }, h.priority && /*#__PURE__*/React.createElement(Icon, {
      name: "flame",
      size: 13,
      style: {
        verticalAlign: '-2px',
        marginRight: 4
      }
    }), h.arrival), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'right'
      }
    }, h.state === 'vacant-dirty' && (bumped.has(h.room) ? /*#__PURE__*/React.createElement(Badge, {
      tone: "info",
      dot: true
    }, "Bumped \u2014 attendant pinged") : /*#__PURE__*/React.createElement("button", {
      className: "fd-chip",
      onClick: () => onBump(h.room)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bell-ring",
      size: 13
    }), " Bump priority")))))))));
  }

  /* ── Night audit — the 90-second ritual ── */
  function NightAuditView({
    items
  }) {
    const STATE = {
      done: {
        tone: 'positive',
        label: 'Clear',
        icon: 'circle-check'
      },
      ready: {
        tone: 'info',
        label: 'Ready',
        icon: 'circle-play'
      },
      blocked: {
        tone: 'caution',
        label: 'Action needed',
        icon: 'circle-alert'
      }
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-page",
      style: {
        maxWidth: 760,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-page__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "fd-h1"
    }, "Night audit"), /*#__PURE__*/React.createElement("p", {
      className: "fd-sub"
    }, "Business date rolls in one transaction \u2014 the trial balance ties to the desk by construction.")), /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, "Business date \xB7 today")), /*#__PURE__*/React.createElement("div", {
      className: "fd-panel",
      style: {
        padding: 0,
        overflow: 'hidden'
      }
    }, items.map((it, i) => {
      const s = STATE[it.state];
      return /*#__PURE__*/React.createElement("div", {
        key: it.id,
        className: "fd-audit__row",
        style: {
          borderTop: i ? '1px solid var(--line-hairline)' : 'none'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: s.icon,
        size: 17,
        style: {
          color: `var(--status-${s.tone}-ink)`
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'block',
          fontSize: 13.5,
          fontWeight: 500
        }
      }, it.label), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'block',
          fontSize: 12,
          color: 'var(--ink-tertiary)'
        }
      }, it.detail)), /*#__PURE__*/React.createElement(Badge, {
        tone: s.tone
      }, s.label));
    }), /*#__PURE__*/React.createElement("div", {
      className: "fd-audit__row",
      style: {
        borderTop: '1px solid var(--line-hairline)',
        background: 'var(--bg-raised)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, "Audit runs unattended at 03:00 \u2014 this checklist exists for early closes."), /*#__PURE__*/React.createElement(Button, {
      disabled: true,
      title: "Close the cashier session first"
    }, "Run night audit"))));
  }
  window.FD_Ops = {
    DeparturesView,
    CheckoutDrawer,
    InHouseView,
    HousekeepingView,
    NightAuditView
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/ops.jsx", error: String((e && e.message) || e) }); }

// concepts/front-desk/rack.jsx
try { (() => {
/* The Desk — Concept · The Rack: rooms × nights, stay bars, sacred status colors, hover context. */
(function () {
  const {
    RoomStatusChip,
    MoneyText
  } = window.AtriumVelaDesignSystem_ec9d90;
  const {
    Icon
  } = window.FD_Shell;
  const {
    useState
  } = React;
  const CELL_W = 76,
    ROOM_W = 148;
  const KIND_LABEL = {
    inhouse: 'In-house',
    arrival: 'Arriving today',
    future: 'Confirmed',
    departure: 'Departing'
  };
  function RackView({
    days,
    rooms,
    stays,
    ooo,
    onStayClick
  }) {
    const [rtFilter, setRtFilter] = useState('All');
    const [hover, setHover] = useState(null); // { stay, x, y }
    const shown = rtFilter === 'All' ? rooms : rooms.filter(r => r.rt === rtFilter);
    const staysByRoom = {};
    stays.forEach(s => {
      (staysByRoom[s.room] = staysByRoom[s.room] || []).push(s);
    });
    const oooByRoom = {};
    ooo.forEach(o => {
      oooByRoom[o.room] = o;
    });
    const bar = s => {
      const visStart = Math.max(0, s.start);
      const clipped = visStart - s.start;
      const visNights = Math.min(s.nights - clipped, days.length - visStart);
      if (visNights <= 0) return null;
      return {
        visStart,
        visNights,
        clipped
      };
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-page__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "fd-h1"
    }, "Rack"), /*#__PURE__*/React.createElement("p", {
      className: "fd-sub"
    }, "14 nights from today \xB7 drag a bar to move or extend a stay (rate & policy preview before commit).")), /*#__PURE__*/React.createElement("div", {
      className: "fd-segs"
    }, ['All', 'STD', 'KING', 'DLX'].map(rt => /*#__PURE__*/React.createElement("button", {
      key: rt,
      className: 'fd-seg' + (rtFilter === rt ? ' is-active' : ''),
      onClick: () => setRtFilter(rt)
    }, rt)))), /*#__PURE__*/React.createElement("div", {
      className: "fd-rack"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-rack__scroll"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-rackgrid",
      style: {
        gridTemplateColumns: `${ROOM_W}px repeat(${days.length}, ${CELL_W}px)`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-rack__corner fd-rack__dayhead",
      style: {
        alignItems: 'flex-start',
        padding: '0 12px',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "dow"
    }, days[0].month, " \u2014 rooms")), days.map(d => /*#__PURE__*/React.createElement("div", {
      key: d.iso,
      className: 'fd-rack__dayhead' + (d.i === 0 ? ' is-today' : '') + (d.weekend ? ' is-weekend' : '')
    }, /*#__PURE__*/React.createElement("span", {
      className: "dow"
    }, d.i === 0 ? 'TODAY' : d.dow), /*#__PURE__*/React.createElement("span", {
      className: "num"
    }, d.num))), shown.map(r => /*#__PURE__*/React.createElement(React.Fragment, {
      key: r.num
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-rack__roomcell"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-rack__roomnum"
    }, r.num), /*#__PURE__*/React.createElement("span", {
      className: "fd-rack__roomrt"
    }, r.rt), /*#__PURE__*/React.createElement("span", {
      className: "fd-rack__dot",
      style: {
        background: `var(--room-${r.state})`
      },
      title: r.state
    })), days.map(d => {
      const o = oooByRoom[r.num];
      const isOoo = o && d.i >= o.start && d.i < o.start + o.nights;
      return /*#__PURE__*/React.createElement("div", {
        key: d.iso,
        className: 'fd-rack__cell' + (d.i === 0 ? ' is-today' : '') + (d.weekend ? ' is-weekend' : '') + (isOoo ? ' is-ooo' : '')
      }, o && d.i === o.start && /*#__PURE__*/React.createElement("span", {
        className: "fd-stay fd-stay--ooo",
        style: {
          left: 4,
          width: o.nights * CELL_W - 10
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "wrench",
        size: 12
      }), " ", o.reason), (staysByRoom[r.num] || []).map(s => {
        const b = bar(s);
        if (!b || b.visStart !== d.i) return null;
        return /*#__PURE__*/React.createElement("button", {
          key: s.id,
          className: 'fd-stay fd-stay--' + s.kind,
          style: {
            left: 3,
            width: b.visNights * CELL_W - 8,
            borderTopLeftRadius: b.clipped ? 2 : undefined,
            borderBottomLeftRadius: b.clipped ? 2 : undefined
          },
          onClick: () => onStayClick(s),
          onMouseEnter: e => setHover({
            stay: s,
            x: e.clientX,
            y: e.clientY
          }),
          onMouseMove: e => setHover({
            stay: s,
            x: e.clientX,
            y: e.clientY
          }),
          onMouseLeave: () => setHover(null)
        }, /*#__PURE__*/React.createElement("span", {
          className: "fd-stay__ch",
          style: {
            background: `var(--channel-${s.channel})`
          }
        }), s.guest);
      }));
    })))))), /*#__PURE__*/React.createElement("div", {
      className: "fd-legend"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__swatch",
      style: {
        background: 'var(--accent-600)'
      }
    }), " In-house"), /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__swatch",
      style: {
        background: 'var(--bg-surface)',
        border: '1.5px solid var(--sky-500)'
      }
    }), " Arriving today"), /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__swatch",
      style: {
        background: 'var(--violet-500)'
      }
    }), " Departing"), /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__swatch",
      style: {
        background: 'var(--bg-sunken)',
        border: '1px solid var(--line-strong)'
      }
    }), " Confirmed"), /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__item"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-legend__swatch",
      style: {
        background: 'repeating-linear-gradient(-45deg, transparent 0 4px, oklch(from var(--rose-500) l c h / .35) 4px 6px)'
      }
    }), " Out of order"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(RoomStatusChip, {
      state: "vacant-clean"
    }), /*#__PURE__*/React.createElement(RoomStatusChip, {
      state: "vacant-dirty"
    }), /*#__PURE__*/React.createElement(RoomStatusChip, {
      state: "inspected"
    }), /*#__PURE__*/React.createElement(RoomStatusChip, {
      state: "occupied"
    })), hover && /*#__PURE__*/React.createElement("div", {
      className: "fd-hovercard",
      style: {
        left: Math.min(hover.x + 14, window.innerWidth - 300),
        top: Math.min(hover.y + 14, window.innerHeight - 170)
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("b", {
      style: {
        fontSize: 14
      }
    }, hover.stay.guest), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.04em',
        textTransform: 'uppercase',
        color: hover.stay.kind === 'arrival' ? 'var(--status-info-ink)' : 'var(--ink-tertiary)'
      }
    }, KIND_LABEL[hover.stay.kind])), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 12.5,
        color: 'var(--ink-secondary)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Room ", hover.stay.room, " \xB7 ", hover.stay.nights, " night", hover.stay.nights > 1 ? 's' : ''), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Rate / night"), /*#__PURE__*/React.createElement(MoneyText, {
      amount: hover.stay.rate
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-tertiary)',
        fontSize: 11.5
      }
    }, hover.stay.kind === 'arrival' ? 'Enter to start check-in · → cycles alternates' : 'Drag to move · edge-drag to extend'))));
  }
  window.FD_Rack = {
    RackView
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/rack.jsx", error: String((e && e.message) || e) }); }

// concepts/front-desk/shell.jsx
try { (() => {
/* The Desk — Concept · shell: Icon, TopBar, Rail, CommandPalette, ActionTray, Toast. */
(function () {
  const {
    Button,
    Kbd
  } = window.AtriumVelaDesignSystem_ec9d90;
  const {
    useState,
    useEffect,
    useRef
  } = React;

  /* Lucide icon — rendered declaratively (React owns the markup). Never use lucide.createIcons():
     it replaces React-owned nodes and crashes reconciliation. */
  const PASCAL = n => n.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  function lucideSvg(name, size) {
    const L = window.lucide;
    if (!L) return '';
    const p = PASCAL(name);
    const node = L.icons && L.icons[p] || L[p];
    if (!node) return '';
    try {
      if (L.createElement) {
        const el = L.createElement(node);
        el.setAttribute('width', String(size));
        el.setAttribute('height', String(size));
        el.setAttribute('stroke-width', '1.5');
        return el.outerHTML;
      }
    } catch (e) {/* fall through */}
    if (Array.isArray(node)) {
      const kids = node.map(([t, a]) => '<' + t + ' ' + Object.entries(a || {}).map(([k, v]) => k + '="' + v + '"').join(' ') + '/>').join('');
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + kids + '</svg>';
    }
    return '';
  }
  function Icon({
    name,
    size = 16,
    style,
    className
  }) {
    const html = React.useMemo(() => lucideSvg(name, size), [name, size]);
    return /*#__PURE__*/React.createElement("i", {
      className: className,
      "aria-hidden": "true",
      style: {
        width: size,
        height: size,
        display: 'inline-flex',
        ...style
      },
      dangerouslySetInnerHTML: {
        __html: html
      }
    });
  }
  function refreshIcons() {/* no-op — icons render declaratively */}

  /* ── Top bar ─────────────────────────────────────────────────────── */
  function TopBar({
    me,
    property,
    properties,
    onProperty,
    theme,
    onToggleTheme,
    density,
    onDensity,
    onOpenK
  }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const onDoc = e => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);
    const initials = me.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    return /*#__PURE__*/React.createElement("header", {
      className: "fd-topbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-brand"
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/vela-mark.svg",
      width: "26",
      height: "26",
      alt: "Vela"
    }), /*#__PURE__*/React.createElement("b", null, "Vela")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      },
      ref: ref
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-chip",
      onClick: () => setOpen(o => !o)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "building-2",
      size: 15,
      style: {
        color: 'var(--ink-tertiary)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, property.name), /*#__PURE__*/React.createElement(Kbd, null, "\u2318P"), /*#__PURE__*/React.createElement(Icon, {
      name: "chevron-down",
      size: 13,
      style: {
        color: 'var(--ink-tertiary)'
      }
    })), open && /*#__PURE__*/React.createElement("div", {
      className: "fd-menu"
    }, properties.map(p => /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "fd-menu__item",
      onClick: () => {
        onProperty(p);
        setOpen(false);
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 500,
        fontSize: 13
      }
    }, p.name), /*#__PURE__*/React.createElement("div", {
      className: "font-mono",
      style: {
        fontSize: 11,
        color: 'var(--ink-tertiary)'
      }
    }, p.code, " \xB7 ", p.currency)), p.id === property.id && /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 15,
      style: {
        color: 'var(--ink-accent)'
      }
    }))))), /*#__PURE__*/React.createElement("button", {
      className: "fd-search",
      onClick: onOpenK
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 15
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        textAlign: 'left'
      }
    }, "Search & command \u2014 guests, rooms, actions\u2026"), /*#__PURE__*/React.createElement(Kbd, null, "\u2318K")), /*#__PURE__*/React.createElement("div", {
      className: "fd-topbar__right"
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "sm"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 14
    }), " Create"), /*#__PURE__*/React.createElement("button", {
      className: "fd-iconbtn",
      onClick: onDensity,
      title: 'Density: ' + density,
      "aria-label": "Cycle density"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: density === 'compact' ? 'rows-4' : density === 'touch' ? 'rows-2' : 'rows-3',
      size: 16
    })), /*#__PURE__*/React.createElement("button", {
      className: "fd-iconbtn",
      onClick: onToggleTheme,
      "aria-label": "Toggle theme"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: theme === 'dark' ? 'sun' : 'moon',
      size: 16
    })), /*#__PURE__*/React.createElement("button", {
      className: "fd-iconbtn",
      "aria-label": "Notifications"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bell",
      size: 16
    }), /*#__PURE__*/React.createElement("span", {
      className: "fd-iconbtn__dot"
    })), /*#__PURE__*/React.createElement("span", {
      className: "fd-me",
      title: me.email
    }, initials)));
  }

  /* ── Rail ────────────────────────────────────────────────────────── */
  const NAV = [{
    id: 'today',
    label: 'Today',
    icon: 'layout-grid',
    kbd: 'g t'
  }, {
    id: 'arrivals',
    label: 'Arrivals',
    icon: 'calendar-check',
    kbd: 'g a'
  }, {
    id: 'rack',
    label: 'Rack',
    icon: 'bed-double',
    kbd: 'g r'
  }, {
    id: 'inhouse',
    label: 'In-house',
    icon: 'users'
  }, {
    id: 'departures',
    label: 'Departures',
    icon: 'door-open'
  }, {
    id: 'folios',
    label: 'Folios',
    icon: 'receipt'
  }, {
    id: 'housekeeping',
    label: 'Housekeeping',
    icon: 'sparkles'
  }];
  function Rail({
    route,
    onRoute
  }) {
    return /*#__PURE__*/React.createElement("nav", {
      className: "fd-rail"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-rail__grow"
    }, NAV.map(n => /*#__PURE__*/React.createElement("button", {
      key: n.id,
      className: 'fd-railitem' + (route === n.id ? ' is-active' : ''),
      onClick: () => onRoute(n.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 16
    }), n.label, n.kbd && /*#__PURE__*/React.createElement("span", {
      className: "fd-railkbd"
    }, /*#__PURE__*/React.createElement(Kbd, null, n.kbd)))), /*#__PURE__*/React.createElement("p", {
      className: "fd-rail__sec"
    }, "Night"), /*#__PURE__*/React.createElement("button", {
      className: 'fd-railitem' + (route === 'audit' ? ' is-active' : ''),
      onClick: () => onRoute('audit')
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "moon-star",
      size: 16
    }), " Night audit")), /*#__PURE__*/React.createElement("button", {
      className: "fd-railitem",
      style: {
        color: 'var(--ink-tertiary)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "log-out",
      size: 16
    }), " Sign out"));
  }

  /* ── Navbar tabs (horizontal nav — default layout) ───────────────── */
  function NavTabs({
    route,
    onRoute,
    badges = {}
  }) {
    const items = [...NAV, {
      id: 'audit',
      label: 'Night audit',
      icon: 'moon-star'
    }];
    return /*#__PURE__*/React.createElement("nav", {
      className: "fd-navtabs",
      "aria-label": "Boards"
    }, items.map(n => /*#__PURE__*/React.createElement("button", {
      key: n.id,
      className: 'fd-navtab' + (route === n.id ? ' is-active' : ''),
      onClick: () => onRoute(n.id)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.icon,
      size: 15
    }), n.label, badges[n.id] > 0 && /*#__PURE__*/React.createElement("span", {
      className: "fd-navtab__badge tnum"
    }, badges[n.id]))));
  }

  /* ── Command palette ─────────────────────────────────────────────── */
  function CommandPalette({
    open,
    onClose,
    items
  }) {
    const [q, setQ] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    useEffect(() => {
      if (open) {
        setQ('');
        setActive(0);
        requestAnimationFrame(() => inputRef.current && inputRef.current.focus());
      }
    }, [open]);
    if (!open) return null;
    const needle = q.trim().toLowerCase();
    const filtered = needle ? items.filter(it => (it.label + ' ' + (it.group || '') + ' ' + (it.hint || '')).toLowerCase().includes(needle)) : items;
    const groups = [];
    filtered.forEach(it => {
      const g = it.group || 'Actions';
      let b = groups.find(x => x[0] === g);
      if (!b) {
        b = [g, []];
        groups.push(b);
      }
      b[1].push(it);
    });
    const run = it => {
      it.run();
      onClose();
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-palette",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Command palette"
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-scrim",
      tabIndex: -1,
      "aria-label": "Close",
      onClick: onClose
    }), /*#__PURE__*/React.createElement("div", {
      className: "fd-palette__panel"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-palette__field"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 17,
      style: {
        color: 'var(--ink-tertiary)'
      }
    }), /*#__PURE__*/React.createElement("input", {
      ref: inputRef,
      value: q,
      placeholder: "Type a guest, room, or action\u2026",
      onChange: e => {
        setQ(e.target.value);
        setActive(0);
      },
      onKeyDown: e => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActive(a => Math.min(a + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActive(a => Math.max(a - 1, 0));
        } else if (e.key === 'Enter' && filtered[active]) {
          e.preventDefault();
          run(filtered[active]);
        } else if (e.key === 'Escape') onClose();
      }
    }), /*#__PURE__*/React.createElement(Kbd, null, "esc")), /*#__PURE__*/React.createElement("div", {
      className: "fd-palette__list"
    }, filtered.length === 0 ? /*#__PURE__*/React.createElement("p", {
      className: "fd-palette__empty"
    }, "No matches for \u201C", q, "\u201D.") : groups.map(([g, gi]) => /*#__PURE__*/React.createElement("div", {
      key: g
    }, /*#__PURE__*/React.createElement("p", {
      className: "fd-palette__group"
    }, g), gi.map(it => {
      const idx = filtered.indexOf(it);
      return /*#__PURE__*/React.createElement("button", {
        key: it.id,
        className: 'fd-palette__item' + (idx === active ? ' is-active' : ''),
        onMouseMove: () => setActive(idx),
        onClick: () => run(it)
      }, /*#__PURE__*/React.createElement(Icon, {
        name: it.icon,
        size: 16,
        style: {
          color: 'var(--ink-tertiary)'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1
        }
      }, it.label), it.hint && /*#__PURE__*/React.createElement("span", {
        className: "font-mono",
        style: {
          fontSize: 11,
          color: 'var(--ink-tertiary)'
        }
      }, it.hint));
    }))))));
  }

  /* ── Action tray (appears on selection) ──────────────────────────── */
  function ActionTray({
    count,
    onClear,
    onAssign,
    onPrereg
  }) {
    if (!count) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-tray",
      role: "toolbar",
      "aria-label": "Bulk actions"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-tray__count tnum"
    }, count, " selected"), /*#__PURE__*/React.createElement("button", {
      className: "fd-tray__btn",
      onClick: onAssign
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "wand-sparkles",
      size: 15
    }), " Auto-assign rooms"), /*#__PURE__*/React.createElement("button", {
      className: "fd-tray__btn",
      onClick: onPrereg
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clipboard-check",
      size: 15
    }), " Pre-register"), /*#__PURE__*/React.createElement("button", {
      className: "fd-tray__btn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "message-square",
      size: 15
    }), " Message"), /*#__PURE__*/React.createElement("button", {
      className: "fd-tray__btn",
      onClick: onClear,
      "aria-label": "Clear selection"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "x",
      size: 15
    })));
  }

  /* ── Toast (action-capable) ──────────────────────────────────────── */
  function Toast({
    toast,
    onUndo
  }) {
    if (!toast) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-toast",
      role: "status"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: toast.icon || 'circle-check',
      size: 17,
      style: {
        color: toast.tone === 'info' ? 'var(--status-info-ink)' : 'var(--status-positive-ink)'
      }
    }), /*#__PURE__*/React.createElement("span", null, toast.text), toast.undo && /*#__PURE__*/React.createElement("button", {
      className: "fd-toast__undo",
      onClick: onUndo
    }, "Undo"));
  }
  window.FD_Shell = {
    Icon,
    refreshIcons,
    TopBar,
    Rail,
    NavTabs,
    CommandPalette,
    ActionTray,
    Toast,
    NAV
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/shell.jsx", error: String((e && e.message) || e) }); }

// concepts/front-desk/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// concepts/front-desk/views.jsx
try { (() => {
/* The Desk — Concept · views: Today (landing) + Arrivals board. */
(function () {
  const {
    Badge,
    Avatar,
    MoneyText,
    StatTile,
    ReservationStatusBadge
  } = window.AtriumVelaDesignSystem_ec9d90;
  const {
    Icon
  } = window.FD_Shell;
  const {
    useState,
    useMemo
  } = React;
  const FACETS = [['room', 'Room assigned'], ['inspected', 'Room inspected'], ['paid', 'Payment verified'], ['regcard', 'Reg card done'], ['key', 'Key ready']];
  const score = a => FACETS.reduce((n, [k]) => n + (a[k] ? 1 : 0), 0);

  /* Composite readiness chip — the exception-first signal. */
  function ReadyChip({
    a
  }) {
    const s = score(a);
    const title = FACETS.map(([k, label]) => (a[k] ? '✓ ' : '· ') + label).join('\n');
    return /*#__PURE__*/React.createElement("span", {
      className: 'fd-ready' + (s === 5 ? ' is-full' : ''),
      title: title
    }, FACETS.map(([k]) => /*#__PURE__*/React.createElement("span", {
      key: k,
      className: 'fd-ready__dot' + (a[k] ? ' is-on' : '')
    })), /*#__PURE__*/React.createElement("span", {
      className: "fd-ready__score"
    }, s, "/5"));
  }
  const CH_LABEL = {
    direct: 'Direct',
    ota: 'OTA',
    corporate: 'Corp',
    group: 'Group',
    walkin: 'Walk-in'
  };
  function ChannelDot({
    ch,
    label = true
  }) {
    return /*#__PURE__*/React.createElement("span", {
      className: "fd-channel"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-channel__dot",
      style: {
        background: `var(--channel-${ch})`
      }
    }), label && CH_LABEL[ch]);
  }

  /* ── Today ───────────────────────────────────────────────────────── */
  function TodayView({
    me,
    arrivals,
    ai,
    channels,
    aiOn,
    onOpen,
    onRoute,
    onAssign,
    onAct
  }) {
    const unassigned = arrivals.filter(a => !a.room);
    const unpaid = arrivals.filter(a => a.room && !a.paid);
    const ready = arrivals.filter(a => score(a) === 5).length;
    const vips = arrivals.filter(a => a.vip);
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-page",
      style: {
        maxWidth: 980,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-page__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "fd-h1"
    }, greet, ", ", me.name.split(' ')[0]), /*#__PURE__*/React.createElement("p", {
      className: "fd-sub"
    }, arrivals.length, " arrivals on the book \xB7 ", ready, " fully ready \u2014 work the exceptions first.")), /*#__PURE__*/React.createElement(Badge, {
      tone: "positive",
      dot: true
    }, "Cashier session open")), /*#__PURE__*/React.createElement("div", {
      className: "fd-tilegrid"
    }, /*#__PURE__*/React.createElement(StatTile, {
      label: "Occupancy",
      value: "84%",
      delta: {
        dir: 'up',
        value: '4%'
      },
      sub: "62 of 74 rooms"
    }), /*#__PURE__*/React.createElement(StatTile, {
      label: "Arrivals",
      value: arrivals.length,
      sub: `${arrivals.length - unassigned.length} assigned · ${unassigned.length} to place`
    }), /*#__PURE__*/React.createElement(StatTile, {
      label: "Departures",
      value: 5,
      sub: "2 due before noon"
    }), /*#__PURE__*/React.createElement(StatTile, {
      label: "ADR",
      value: "$241",
      delta: {
        dir: 'up',
        value: '4%'
      },
      sub: "vs. same day last week"
    })), /*#__PURE__*/React.createElement("section", {
      className: "fd-panel"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "circle-alert",
      size: 16,
      style: {
        color: 'var(--status-caution-ink)'
      }
    }), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: 16,
        fontWeight: 600
      }
    }, "Needs attention"), /*#__PURE__*/React.createElement(Badge, {
      tone: "caution"
    }, unassigned.length + unpaid.length + 1)), /*#__PURE__*/React.createElement("ul", {
      className: "fd-attn"
    }, unassigned.map(a => /*#__PURE__*/React.createElement("li", {
      key: a.id,
      className: "fd-attn__row",
      onClick: () => onOpen(a.id)
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__icon",
      style: {
        background: 'var(--status-caution-bg)',
        color: 'var(--status-caution-ink)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bed-double",
      size: 15
    })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__title"
    }, a.last, ", ", a.first, " arrives ", a.eta, " \u2014 no room assigned"), /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__meta",
      style: {
        display: 'block'
      }
    }, a.roomType, " \xB7 ", a.nights, "N \xB7 ", /*#__PURE__*/React.createElement("span", {
      className: "font-mono"
    }, a.conf))), /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__act"
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-chip",
      onClick: e => {
        e.stopPropagation();
        onAssign(a.id);
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "wand-sparkles",
      size: 13
    }), " Assign")))), unpaid.map(a => /*#__PURE__*/React.createElement("li", {
      key: a.id,
      className: "fd-attn__row",
      onClick: () => onOpen(a.id)
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__icon",
      style: {
        background: 'var(--status-critical-bg)',
        color: 'var(--status-critical-ink)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "credit-card",
      size: 15
    })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__title"
    }, "Payment not verified \u2014 ", a.last, ", ", a.first), /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__meta",
      style: {
        display: 'block'
      }
    }, "Card on file declined pre-auth \xB7 balance ", /*#__PURE__*/React.createElement(MoneyText, {
      amount: a.balance
    }))), /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__act",
      style: {
        display: 'inline-flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-chip",
      onClick: e => {
        e.stopPropagation();
        onAct({
          icon: 'link',
          tone: 'info',
          text: 'Pay-by-link sent to ' + a.first + ' — expires in 24h'
        });
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "link",
      size: 13
    }), " Pay link"), /*#__PURE__*/React.createElement("button", {
      className: "fd-chip",
      onClick: e => {
        e.stopPropagation();
        onAct({
          icon: 'rotate-ccw',
          text: 'Pre-auth retried — approved'
        });
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "rotate-ccw",
      size: 13
    }), " Retry")))), /*#__PURE__*/React.createElement("li", {
      className: "fd-attn__row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__icon",
      style: {
        background: 'var(--status-info-bg)',
        color: 'var(--status-info-ink)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "timer",
      size: 15
    })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__title"
    }, "Hold on 520 expires 17:00 \u2014 Tanaka (tentative)"), /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__meta",
      style: {
        display: 'block'
      }
    }, "Deluxe Suite \xB7 2N \xB7 deposit link sent, unpaid")), /*#__PURE__*/React.createElement("span", {
      className: "fd-attn__act"
    }, /*#__PURE__*/React.createElement("button", {
      className: "fd-chip"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 13
    }), " Re-send link"))))), aiOn && /*#__PURE__*/React.createElement("section", {
      className: "fd-panel"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 16,
      style: {
        color: 'var(--ink-accent)'
      }
    }), /*#__PURE__*/React.createElement("h2", {
      style: {
        margin: 0,
        fontSize: 16,
        fontWeight: 600
      }
    }, "Vela AI"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-tertiary)'
      }
    }, "assistive \xB7 approve-before-publish \xB7 every action audited")), /*#__PURE__*/React.createElement("div", {
      className: "fd-aigrid"
    }, ai.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.id,
      className: "fd-ai"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-ai__head"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: s.icon,
      size: 15,
      style: {
        color: 'var(--ink-accent)'
      }
    }), /*#__PURE__*/React.createElement("b", null, s.title), /*#__PURE__*/React.createElement("span", {
      className: "fd-ai__conf font-mono"
    }, s.confidence)), /*#__PURE__*/React.createElement("p", {
      className: "fd-ai__body"
    }, s.body), /*#__PURE__*/React.createElement("div", {
      className: "fd-ai__acts"
    }, s.actions.map((label, i) => /*#__PURE__*/React.createElement("button", {
      key: label,
      className: "fd-chip",
      style: i === 0 ? {
        color: 'var(--ink-accent)',
        fontWeight: 500
      } : undefined,
      onClick: () => onAct({
        icon: 'sparkles',
        tone: 'info',
        text: s.kind === 'pricing' ? 'Rate change published — channels sync <60s · audited' : label + ' — queued',
        undo: s.kind === 'pricing'
      })
    }, label)), /*#__PURE__*/React.createElement("button", {
      className: "fd-ai__dismiss",
      onClick: () => onAct({
        icon: 'x',
        text: 'Dismissed — feedback recorded'
      })
    }, "Dismiss")))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("section", {
      className: "fd-panel"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec"
    }, "VIP arrivals"), /*#__PURE__*/React.createElement("div", {
      className: "fd-vipstrip"
    }, vips.map(a => /*#__PURE__*/React.createElement("button", {
      key: a.id,
      className: "fd-vip",
      onClick: () => onOpen(a.id)
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: a.first + ' ' + a.last,
      size: "sm"
    }), a.first, " ", a.last, /*#__PURE__*/React.createElement("span", {
      className: "font-mono",
      style: {
        fontSize: 10.5,
        color: 'var(--ink-tertiary)'
      }
    }, a.eta))))), /*#__PURE__*/React.createElement("section", {
      className: "fd-panel"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec"
    }, "Shift handover"), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontSize: 13,
        lineHeight: 1.55,
        color: 'var(--ink-secondary)'
      }
    }, "Marino (518) \u2014 champagne on arrival, billing to corporate master. 304 out of order through Friday, plumbing. One comp posted last shift (folio F-0992, manager-approved).")), /*#__PURE__*/React.createElement("section", {
      className: "fd-panel",
      style: {
        gridColumn: '1 / -1'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("h3", {
      className: "fd-sec",
      style: {
        margin: 0
      }
    }, "Distribution health"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-tertiary)'
      }
    }, "same availability counters the desk writes \u2014 zero sync lag by construction")), /*#__PURE__*/React.createElement("div", {
      className: "fd-chgrid"
    }, channels.map(c => /*#__PURE__*/React.createElement("div", {
      key: c.name,
      className: "fd-chhealth"
    }, /*#__PURE__*/React.createElement("span", {
      className: "fd-chhealth__dot",
      style: {
        background: c.ok ? 'var(--status-positive-ink)' : 'var(--status-caution-ink)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 13,
        fontWeight: 500
      }
    }, c.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 11.5,
        color: c.ok ? 'var(--ink-tertiary)' : 'var(--status-caution-ink)'
      }
    }, c.note)), /*#__PURE__*/React.createElement("span", {
      className: "font-mono",
      style: {
        fontSize: 11.5,
        color: 'var(--ink-tertiary)'
      }
    }, c.lag)))))), /*#__PURE__*/React.createElement("button", {
      className: "fd-chip",
      style: {
        alignSelf: 'flex-start'
      },
      onClick: () => onRoute('arrivals')
    }, "Open arrivals board ", /*#__PURE__*/React.createElement(Icon, {
      name: "arrow-right",
      size: 13
    })));
  }

  /* ── Arrivals board ──────────────────────────────────────────────── */
  const VIEWS = ['All', 'Unassigned', 'VIP', 'In queue'];
  function ArrivalsView({
    arrivals,
    newIds,
    selected,
    onSelect,
    checked,
    onCheck,
    onOpen
  }) {
    const [view, setView] = useState('All');
    const rows = useMemo(() => {
      let r = arrivals;
      if (view === 'Unassigned') r = r.filter(a => !a.room);else if (view === 'VIP') r = r.filter(a => a.vip);else if (view === 'In queue') r = r.filter(a => a.room && !a.inspected);
      return [...r].sort((x, y) => score(x) - score(y) || x.eta.localeCompare(y.eta));
    }, [arrivals, view]);
    const unassigned = arrivals.filter(a => !a.room).length;
    const allChecked = rows.length > 0 && rows.every(a => checked.has(a.id));
    return /*#__PURE__*/React.createElement("div", {
      className: "fd-page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "fd-page__head"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "fd-h1"
    }, "Arrivals"), /*#__PURE__*/React.createElement("p", {
      className: "fd-sub"
    }, "Sorted by readiness \u2014 exceptions float to the top. ", /*#__PURE__*/React.createElement(Icon, {
      name: "smartphone",
      size: 11
    }), " = guest self check-in underway. ", /*#__PURE__*/React.createElement(Icon, {
      name: "corner-down-left",
      size: 11
    }), " starts check-in.")), /*#__PURE__*/React.createElement("div", {
      className: "fd-segs"
    }, VIEWS.map(v => /*#__PURE__*/React.createElement("button", {
      key: v,
      className: 'fd-seg' + (view === v ? ' is-active' : ''),
      onClick: () => setView(v)
    }, v, v === 'Unassigned' && unassigned > 0 && /*#__PURE__*/React.createElement(Badge, {
      tone: "caution"
    }, unassigned))))), /*#__PURE__*/React.createElement("div", {
      className: "fd-board"
    }, /*#__PURE__*/React.createElement("table", {
      className: "fd-table"
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
      style: {
        width: 34
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      className: "fd-check",
      checked: allChecked,
      "aria-label": "Select all",
      onChange: () => onCheck(allChecked ? [] : rows.map(a => a.id), true)
    })), /*#__PURE__*/React.createElement("th", null, "ETA"), /*#__PURE__*/React.createElement("th", null, "Guest"), /*#__PURE__*/React.createElement("th", null, "Channel"), /*#__PURE__*/React.createElement("th", null, "Stay"), /*#__PURE__*/React.createElement("th", null, "Readiness"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", {
      style: {
        textAlign: 'right'
      }
    }, "Balance"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(a => /*#__PURE__*/React.createElement("tr", {
      key: a.id,
      tabIndex: 0,
      className: 'fd-row' + (selected === a.id ? ' is-selected' : '') + (newIds.has(a.id) ? ' is-new' : ''),
      onClick: () => onOpen(a.id),
      onKeyDown: e => {
        if (e.key === 'Enter') onOpen(a.id);
      }
    }, /*#__PURE__*/React.createElement("td", {
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      className: "fd-check",
      checked: checked.has(a.id),
      "aria-label": 'Select ' + a.last,
      onChange: () => onCheck([a.id])
    })), /*#__PURE__*/React.createElement("td", {
      className: "fd-eta"
    }, a.eta), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500
      }
    }, a.last, ", ", a.first), a.vip && /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, "VIP"), a.online && /*#__PURE__*/React.createElement("span", {
      title: a.online === 'done' ? 'Online check-in complete — ID uploaded, reg card e-signed' : 'Online check-in started on guest’s phone',
      style: {
        display: 'inline-flex',
        color: a.online === 'done' ? 'var(--status-positive-ink)' : 'var(--status-caution-ink)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "smartphone",
      size: 13
    })), /*#__PURE__*/React.createElement("span", {
      className: "font-mono",
      style: {
        fontSize: 11,
        color: 'var(--ink-tertiary)'
      }
    }, a.conf))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(ChannelDot, {
      ch: a.channel
    })), /*#__PURE__*/React.createElement("td", {
      className: "font-mono",
      style: {
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, a.nights, "N \xB7 ", a.rt, a.room ? ' · ' + a.room : ''), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(ReadyChip, {
      a: a
    })), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(ReservationStatusBadge, {
      status: a.status
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement(MoneyText, {
      amount: a.balance
    }))))))));
  }
  window.FD_Views = {
    TodayView,
    ArrivalsView,
    ReadyChip,
    ChannelDot,
    score
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "concepts/front-desk/views.jsx", error: String((e && e.message) || e) }); }

// ui_kits/the-desk/app.jsx
try { (() => {
/* The Desk — root app. Login → shell (Today / Arrivals) → reservation drawer + ⌘K. */
const {
  TopBar: TB,
  Rail: RL,
  CommandPalette: CP,
  Drawer: DW,
  refreshIcons: RI
} = window.DeskShell;
const {
  LoginScreen: LS,
  TodayView: TV,
  ArrivalsView: AV,
  ReservationBody: RB
} = window.DeskScreens;
const {
  Button: BTN,
  Badge: BDG
} = window.AtriumVelaDesignSystem_ec9d90;
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
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setKOpen(o => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  RR.useLayoutEffect(() => {
    RI();
  });
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const selectedRes = arrivals.find(a => a.id === selected);
  const doCheckIn = () => {
    setBusy(true);
    setTimeout(() => {
      setCheckedIn(m => ({
        ...m,
        [selected]: true
      }));
      setArrivals(list => list.map(a => a.id === selected ? {
        ...a,
        status: 'checked_in',
        assigned: a.assigned || '418',
        inspected: true
      } : a));
      setBusy(false);
    }, 700);
  };
  const kItems = [{
    id: 'n-today',
    group: 'Navigate',
    label: 'Today',
    icon: 'layout-grid',
    hint: 'g t',
    run: () => setRoute('today')
  }, {
    id: 'n-arr',
    group: 'Navigate',
    label: 'Arrivals board',
    icon: 'calendar-check',
    hint: 'g a',
    run: () => setRoute('arrivals')
  }, {
    id: 'n-rack',
    group: 'Navigate',
    label: 'Rack',
    icon: 'bed-double',
    run: () => setRoute('rack')
  }, ...arrivals.slice(0, 4).map(a => ({
    id: 'e-' + a.id,
    group: 'Guests',
    label: 'Check in ' + a.first + ' ' + a.last,
    icon: 'user-check',
    hint: a.conf,
    run: () => {
      setRoute('arrivals');
      setSelected(a.id);
    }
  })), {
    id: 'a-create',
    group: 'Actions',
    label: 'New reservation',
    icon: 'circle-plus',
    run: () => {}
  }, {
    id: 'a-theme',
    group: 'Actions',
    label: 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode',
    icon: theme === 'dark' ? 'sun' : 'moon',
    run: toggleTheme
  }, {
    id: 'a-signout',
    group: 'Session',
    label: 'Sign out',
    icon: 'log-out',
    run: () => setAuthed(false)
  }];
  if (!authed) return /*#__PURE__*/React.createElement(LS, {
    onSignIn: () => {
      setAuthed(true);
      setRoute('today');
    }
  });
  const total = arrivals.length;
  const assigned = arrivals.filter(a => a.assigned).length;
  const pulse = [{
    id: 'occ',
    label: 'Occupancy',
    value: '84%',
    delta: {
      dir: 'up',
      value: '4%'
    },
    tone: 'info'
  }, {
    id: 'arr',
    label: 'Arrivals',
    value: total,
    progress: assigned / total,
    onClick: () => setRoute('arrivals')
  }, {
    id: 'queue',
    label: 'Unassigned',
    value: total - assigned,
    tone: total - assigned > 0 ? 'caution' : 'positive'
  }, {
    id: 'dep',
    label: 'Departures',
    value: 5,
    progress: 0.4
  }, {
    id: 'hk',
    label: 'HK to inspect',
    value: 9,
    tone: 'caution'
  }, {
    id: 'adr',
    label: 'ADR',
    value: '$241',
    delta: {
      dir: 'up',
      value: '4%'
    },
    tone: 'positive'
  }, {
    id: 'alerts',
    label: 'Alerts',
    value: 2,
    tone: 'critical'
  }];
  const {
    PulseBar: PBC
  } = window.AtriumVelaDesignSystem_ec9d90;
  return /*#__PURE__*/React.createElement("div", {
    className: "desk-shell"
  }, /*#__PURE__*/React.createElement(TB, {
    me: data.me,
    property: property,
    properties: data.properties,
    onProperty: setProperty,
    theme: theme,
    onToggleTheme: toggleTheme,
    onOpenK: () => setKOpen(true),
    onCreate: () => setRoute('arrivals')
  }), /*#__PURE__*/React.createElement("div", {
    className: "desk-body"
  }, /*#__PURE__*/React.createElement(RL, {
    route: route,
    onRoute: setRoute,
    onSignOut: () => setAuthed(false)
  }), /*#__PURE__*/React.createElement("main", {
    className: "desk-main"
  }, /*#__PURE__*/React.createElement(PBC, {
    chips: pulse
  }), /*#__PURE__*/React.createElement("div", {
    className: "desk-scroll"
  }, route === 'today' && /*#__PURE__*/React.createElement(TV, {
    me: data.me,
    arrivals: arrivals,
    onOpen: id => {
      setRoute('arrivals');
      setSelected(id);
    },
    onRoute: setRoute
  }), route === 'arrivals' && /*#__PURE__*/React.createElement(AV, {
    arrivals: arrivals,
    onOpen: setSelected,
    selectedId: selected
  }), !['today', 'arrivals'].includes(route) && /*#__PURE__*/React.createElement("div", {
    className: "desk-empty"
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "hammer"
  }), /*#__PURE__*/React.createElement("p", null, "The ", /*#__PURE__*/React.createElement("b", null, route), " board lives in the full product. This kit showcases Today, Arrivals & the check-in drawer."), /*#__PURE__*/React.createElement(BTN, {
    variant: "secondary",
    size: "sm",
    onClick: () => setRoute('arrivals')
  }, "Back to Arrivals"))))), /*#__PURE__*/React.createElement(DW, {
    open: !!selectedRes,
    onClose: () => setSelected(null),
    width: 560,
    title: selectedRes ? selectedRes.conf : 'Reservation',
    description: selectedRes ? selectedRes.roomType : '',
    footer: selectedRes && (checkedIn[selectedRes.id] || selectedRes.status === 'checked_in' ? /*#__PURE__*/React.createElement("div", {
      className: "desk-drawer__footrow"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--status-positive-ink)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "circle-check",
      size: 15
    }), " Checked in \u2014 in-house"), /*#__PURE__*/React.createElement(BTN, {
      variant: "secondary",
      onClick: () => setSelected(null)
    }, "Close")) : /*#__PURE__*/React.createElement("div", {
      className: "desk-drawer__footrow"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--ink-tertiary)'
      }
    }, "Ready to check in"), /*#__PURE__*/React.createElement(BTN, {
      onClick: doCheckIn,
      loading: busy
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "log-in",
      size: 15
    }), " Check in")))
  }, selectedRes && /*#__PURE__*/React.createElement(RB, {
    res: selectedRes,
    checkedIn: checkedIn[selectedRes.id] || selectedRes.status === 'checked_in'
  })), /*#__PURE__*/React.createElement(CP, {
    open: kOpen,
    onClose: () => setKOpen(false),
    items: kItems
  }));
}

/* Ic (window.DeskShell.Icon) is already a global const from screens.jsx — reuse it. */
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/the-desk/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/the-desk/data.js
try { (() => {
/* The Desk — demo data, derived from the repo's seed (tooling/seed/index.ts).
   Property: "Grand Vela — Ocean Club" (GVOC, USD). Guests & room types match the seed. */
window.DESK_DATA = function () {
  const properties = [{
    id: 'gvoc',
    name: 'Grand Vela — Ocean Club',
    code: 'GVOC',
    currency: 'USD'
  }, {
    id: 'gvch',
    name: 'Grand Vela — Cliff House',
    code: 'GVCH',
    currency: 'USD'
  }, {
    id: 'gvla',
    name: 'Grand Vela — Laguna',
    code: 'GVLA',
    currency: 'MXN'
  }];
  const me = {
    name: 'Frankie Doyle',
    email: 'frankie@grand-vela.demo',
    role: 'Front Desk'
  };

  // Today's arrivals the desk will work. Readiness drives the board.
  const arrivals = [{
    id: 'r0',
    conf: 'BK-1000',
    first: 'Dana',
    last: 'Rivera',
    adults: 2,
    children: 0,
    roomType: 'King Ocean View',
    rt: 'KING',
    nights: 1,
    channel: 'direct',
    status: 'confirmed',
    assigned: '412',
    inspected: true,
    paid: true,
    vip: false,
    balance: '240.00',
    total: '264.00',
    traits: ['2nd stay', 'prefers high floor']
  }, {
    id: 'r1',
    conf: 'BK-1001',
    first: 'Ito',
    last: 'Nakamura',
    adults: 1,
    children: 0,
    roomType: 'Deluxe Suite',
    rt: 'DLX',
    nights: 2,
    channel: 'ota',
    status: 'confirmed',
    assigned: null,
    inspected: false,
    paid: true,
    vip: false,
    balance: '840.00',
    total: '924.00',
    traits: ['quiet floor', 'late arrival 15:40']
  }, {
    id: 'r2',
    conf: 'BK-1002',
    first: 'Priya',
    last: 'Patel',
    adults: 2,
    children: 1,
    roomType: 'Standard Queen',
    rt: 'STD',
    nights: 3,
    channel: 'direct',
    status: 'confirmed',
    assigned: '208',
    inspected: true,
    paid: false,
    vip: true,
    balance: '540.00',
    total: '594.00',
    traits: ['3rd stay', 'prefers high floor', 'allergy: nuts']
  }, {
    id: 'r3',
    conf: 'BK-1003',
    first: 'Marcus',
    last: 'Bell',
    adults: 2,
    children: 0,
    roomType: 'King Ocean View',
    rt: 'KING',
    nights: 1,
    channel: 'ota',
    status: 'confirmed',
    assigned: null,
    inspected: false,
    paid: true,
    vip: false,
    balance: '240.00',
    total: '264.00',
    traits: ['anniversary']
  }, {
    id: 'r4',
    conf: 'BK-1004',
    first: 'Sofia',
    last: 'Marino',
    adults: 1,
    children: 0,
    roomType: 'Deluxe Suite',
    rt: 'DLX',
    nights: 2,
    channel: 'direct',
    status: 'confirmed',
    assigned: '515',
    inspected: true,
    paid: true,
    vip: true,
    balance: '0.00',
    total: '840.00',
    traits: ['VIP — repeat', 'champagne on arrival']
  }, {
    id: 'r5',
    conf: 'BK-1005',
    first: 'Liam',
    last: "O\u2019Brien",
    adults: 2,
    children: 2,
    roomType: 'Standard Queen',
    rt: 'STD',
    nights: 3,
    channel: 'ota',
    status: 'confirmed',
    assigned: null,
    inspected: false,
    paid: false,
    vip: false,
    balance: '540.00',
    total: '594.00',
    traits: ['family · 2 children', 'connecting rooms']
  }, {
    id: 'r6',
    conf: 'BK-1006',
    first: 'Chen',
    last: 'Wei',
    adults: 1,
    children: 0,
    roomType: 'King Ocean View',
    rt: 'KING',
    nights: 2,
    channel: 'corporate',
    status: 'confirmed',
    assigned: '410',
    inspected: true,
    paid: true,
    vip: false,
    balance: '480.00',
    total: '528.00',
    traits: ['corporate rate', 'early checkout']
  }, {
    id: 'r7',
    conf: 'BK-1007',
    first: 'Amara',
    last: 'Okafor',
    adults: 2,
    children: 0,
    roomType: 'Deluxe Suite',
    rt: 'DLX',
    nights: 1,
    channel: 'direct',
    status: 'confirmed',
    assigned: '518',
    inspected: false,
    paid: true,
    vip: false,
    balance: '420.00',
    total: '462.00',
    traits: ['ocean view requested']
  }];
  const nightlyByRt = {
    KING: '240.00',
    DLX: '420.00',
    STD: '180.00'
  };
  return {
    properties,
    me,
    arrivals,
    nightlyByRt
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/the-desk/data.js", error: String((e && e.message) || e) }); }

// ui_kits/the-desk/screens.jsx
try { (() => {
/* The Desk — screens: Login, Today, Arrivals, ReservationDrawer body. */
const {
  Button: B,
  Input: I,
  Badge: Bd,
  MoneyText: M,
  PulseBar: PB,
  StatTile: ST,
  RoomStatusChip: RSC,
  ReservationStatusBadge: RSB,
  GuestCard: GC,
  Avatar: Av,
  Skeleton: Sk
} = window.AtriumVelaDesignSystem_ec9d90;
const {
  Icon: Ic
} = window.DeskShell;
const {
  useState: uS
} = React;

/* ── Login ───────────────────────────────────────────────────────────────── */
function LoginScreen({
  onSignIn
}) {
  const [email, setEmail] = uS('frankie@grand-vela.demo');
  const [password, setPassword] = uS('demo-password');
  const [loading, setLoading] = uS(false);
  const submit = e => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSignIn();
    }, 650);
  };
  return /*#__PURE__*/React.createElement("main", {
    className: "desk-login"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-login__card-wrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-login__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/vela-mark.svg",
    width: "44",
    height: "44",
    alt: ""
  }), /*#__PURE__*/React.createElement("h1", {
    className: "font-display",
    style: {
      margin: '14px 0 2px',
      fontSize: 24,
      fontWeight: 600
    }
  }, "The Desk"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 12,
      color: 'var(--ink-tertiary)'
    }
  }, "Sign in to Vela \u2014 calm surface, deep machine.")), /*#__PURE__*/React.createElement("form", {
    className: "desk-login__card",
    onSubmit: submit
  }, /*#__PURE__*/React.createElement("label", {
    className: "desk-field"
  }, /*#__PURE__*/React.createElement("span", null, "Email"), /*#__PURE__*/React.createElement(I, {
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value),
    autoComplete: "username"
  })), /*#__PURE__*/React.createElement("label", {
    className: "desk-field"
  }, /*#__PURE__*/React.createElement("span", null, "Password"), /*#__PURE__*/React.createElement(I, {
    type: "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    autoComplete: "current-password"
  })), /*#__PURE__*/React.createElement(B, {
    type: "submit",
    loading: loading,
    style: {
      width: '100%'
    }
  }, "Sign in")), /*#__PURE__*/React.createElement("p", {
    style: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 11,
      color: 'var(--ink-tertiary)'
    }
  }, "Demo property \xB7 Grand Vela \u2014 Ocean Club")));
}

/* ── Today ───────────────────────────────────────────────────────────────── */
function TodayView({
  me,
  arrivals,
  onOpen,
  onRoute
}) {
  const unassigned = arrivals.filter(a => !a.assigned);
  const assigned = arrivals.length - unassigned.length;
  return /*#__PURE__*/React.createElement("div", {
    className: "desk-page",
    style: {
      maxWidth: 960,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-display",
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 600
    }
  }, "Good day, ", me.name.split(' ')[0]), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 12,
      color: 'var(--ink-tertiary)'
    }
  }, arrivals.length, " arrivals remaining \u2014 work the exceptions first.")), /*#__PURE__*/React.createElement("div", {
    className: "desk-tilegrid"
  }, /*#__PURE__*/React.createElement(ST, {
    label: "Occupancy",
    value: "84%",
    delta: {
      dir: 'up',
      value: '4%'
    },
    sub: "vs. yesterday"
  }), /*#__PURE__*/React.createElement(ST, {
    label: "Arrivals",
    value: arrivals.length,
    sub: `${assigned} of ${arrivals.length} ready`
  }), /*#__PURE__*/React.createElement(ST, {
    label: "Departures",
    value: 5,
    sub: "2 due now"
  }), /*#__PURE__*/React.createElement(ST, {
    label: "ADR",
    value: "$241",
    delta: {
      dir: 'up',
      value: '4%'
    }
  })), /*#__PURE__*/React.createElement("section", {
    className: "desk-panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-panel__head"
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "circle-alert",
    size: 16,
    style: {
      color: 'var(--status-caution-ink)'
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600
    }
  }, "Needs attention"), /*#__PURE__*/React.createElement(Bd, {
    tone: "caution"
  }, unassigned.length)), unassigned.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: 'var(--ink-tertiary)',
      margin: 0
    }
  }, "All clear \u2014 every arrival has a room. Next at 15:40 (Nakamura, DLX).") : /*#__PURE__*/React.createElement("ul", {
    className: "desk-attn"
  }, unassigned.map(a => /*#__PURE__*/React.createElement("li", {
    key: a.id,
    className: "desk-attn__row",
    onClick: () => onOpen(a.id)
  }, /*#__PURE__*/React.createElement("span", {
    className: "desk-attn__name"
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "bed-double",
    size: 16,
    style: {
      color: 'var(--ink-tertiary)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, a.last, ", ", a.first), a.vip && /*#__PURE__*/React.createElement(Bd, {
    tone: "accent"
  }, "VIP"), /*#__PURE__*/React.createElement("span", {
    className: "font-mono",
    style: {
      fontSize: 11,
      color: 'var(--ink-tertiary)'
    }
  }, a.conf)), /*#__PURE__*/React.createElement("span", {
    className: "desk-attn__flag"
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "clock",
    size: 14
  }), " Unassigned")))), /*#__PURE__*/React.createElement("button", {
    className: "desk-link",
    onClick: () => onRoute('arrivals')
  }, "Open arrivals board ", /*#__PURE__*/React.createElement(Ic, {
    name: "arrow-right",
    size: 14
  }))));
}

/* ── Arrivals board ──────────────────────────────────────────────────────── */
const VIEWS = ['All', 'Unassigned', 'VIP', 'In queue'];
function ArrivalsView({
  arrivals,
  onOpen,
  selectedId
}) {
  const [view, setView] = uS('All');
  let rows = arrivals;
  if (view === 'Unassigned') rows = arrivals.filter(a => !a.assigned);else if (view === 'VIP') rows = arrivals.filter(a => a.vip);else if (view === 'In queue') rows = arrivals.filter(a => !a.inspected);
  const unassignedCount = arrivals.filter(a => !a.assigned).length;
  return /*#__PURE__*/React.createElement("div", {
    className: "desk-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-page__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-display",
    style: {
      margin: 0,
      fontSize: 24,
      fontWeight: 600
    }
  }, "Arrivals"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 12,
      color: 'var(--ink-tertiary)'
    }
  }, "Work the exceptions, not the list \u2014 sort by readiness.")), /*#__PURE__*/React.createElement("div", {
    className: "desk-segs"
  }, VIEWS.map(v => /*#__PURE__*/React.createElement("button", {
    key: v,
    className: 'desk-seg' + (view === v ? ' is-active' : ''),
    onClick: () => setView(v)
  }, v, v === 'Unassigned' && /*#__PURE__*/React.createElement(Bd, {
    tone: "caution",
    style: {
      marginLeft: 6
    }
  }, unassignedCount))))), /*#__PURE__*/React.createElement("div", {
    className: "desk-grid"
  }, /*#__PURE__*/React.createElement("table", {
    className: "desk-table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Conf."), /*#__PURE__*/React.createElement("th", null, "Guest"), /*#__PURE__*/React.createElement("th", null, "Stay"), /*#__PURE__*/React.createElement("th", null, "Pax"), /*#__PURE__*/React.createElement("th", null, "Readiness"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: 'right'
    }
  }, "Balance"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(a => /*#__PURE__*/React.createElement("tr", {
    key: a.id,
    className: 'desk-row' + (selectedId === a.id ? ' is-selected' : ''),
    tabIndex: 0,
    onClick: () => onOpen(a.id),
    onKeyDown: e => {
      if (e.key === 'Enter') onOpen(a.id);
    }
  }, /*#__PURE__*/React.createElement("td", {
    className: "font-mono",
    style: {
      color: 'var(--ink-secondary)'
    }
  }, a.conf), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, a.last, ", ", a.first), a.vip && /*#__PURE__*/React.createElement(Bd, {
    tone: "accent"
  }, "VIP"))), /*#__PURE__*/React.createElement("td", {
    className: "font-mono",
    style: {
      fontSize: 12,
      color: 'var(--ink-tertiary)'
    }
  }, a.nights, "N \xB7 ", a.rt), /*#__PURE__*/React.createElement("td", {
    className: "tnum",
    style: {
      color: 'var(--ink-secondary)'
    }
  }, a.adults, "+", a.children), /*#__PURE__*/React.createElement("td", null, a.assigned ? /*#__PURE__*/React.createElement("span", {
    className: "desk-ready is-ok"
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "circle-check",
    size: 15
  }), " Room ", a.assigned) : /*#__PURE__*/React.createElement("span", {
    className: "desk-ready"
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "circle",
    size: 15
  }), " Unassigned")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(RSB, {
    status: a.status
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(M, {
    amount: a.balance
  }))))))));
}

/* ── Reservation drawer body ─────────────────────────────────────────────── */
function ReservationBody({
  res,
  checkedIn
}) {
  const nightly = window.DESK_DATA.nightlyByRt[res.rt];
  const nights = Array.from({
    length: res.nights
  }, (_, i) => i);
  const postings = [{
    id: 'p1',
    desc: 'Room Charge — ' + res.roomType,
    date: 'business date',
    amount: nightly
  }, ...(res.paid ? [{
    id: 'p2',
    desc: 'Payment — Visa ••42',
    date: 'on file',
    amount: '-' + nightly
  }] : [])];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(GC, {
    name: res.first + ' ' + res.last,
    vip: res.vip,
    summary: res.roomType + ' · ' + res.nights + ' night' + (res.nights > 1 ? 's' : '') + ' · ' + res.conf,
    traits: res.traits,
    ltv: (Number(res.total) * 7).toFixed(2)
  }), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", {
    className: "desk-sec"
  }, "Readiness"), /*#__PURE__*/React.createElement("div", {
    className: "desk-readgrid"
  }, /*#__PURE__*/React.createElement(ReadFlag, {
    ok: !!res.assigned,
    label: res.assigned ? 'Room ' + res.assigned : 'Room'
  }), /*#__PURE__*/React.createElement(ReadFlag, {
    ok: res.inspected,
    label: "Inspected"
  }), /*#__PURE__*/React.createElement(ReadFlag, {
    ok: res.paid,
    label: "Payment"
  }), /*#__PURE__*/React.createElement(ReadFlag, {
    ok: true,
    label: "Reg card"
  }))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("h3", {
    className: "desk-sec"
  }, "Stay"), /*#__PURE__*/React.createElement("div", {
    className: "desk-ledger"
  }, nights.map(n => /*#__PURE__*/React.createElement("div", {
    key: n,
    className: "desk-ledger__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono",
    style: {
      fontSize: 12,
      color: 'var(--ink-secondary)'
    }
  }, "Night ", n + 1), /*#__PURE__*/React.createElement(M, {
    amount: nightly
  }))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    className: "desk-sec-row"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "desk-sec",
    style: {
      margin: 0
    }
  }, "Folio F-1", res.id.slice(1), "0"), /*#__PURE__*/React.createElement(Bd, {
    tone: checkedIn ? 'info' : 'neutral'
  }, checkedIn ? 'open' : 'pending')), /*#__PURE__*/React.createElement("div", {
    className: "desk-ledger"
  }, postings.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.id,
    className: "desk-ledger__row"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    className: "font-mono",
    style: {
      fontSize: 11,
      color: 'var(--ink-tertiary)'
    }
  }, p.date)), /*#__PURE__*/React.createElement(M, {
    amount: p.amount
  }))), /*#__PURE__*/React.createElement("div", {
    className: "desk-ledger__row desk-ledger__balance"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--ink-secondary)'
    }
  }, /*#__PURE__*/React.createElement(Ic, {
    name: "circle-check",
    size: 14
  }), " Balance"), /*#__PURE__*/React.createElement(M, {
    amount: res.balance
  })))));
}
function ReadFlag({
  ok,
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: 'desk-flag' + (ok ? ' is-ok' : '')
  }, /*#__PURE__*/React.createElement(Ic, {
    name: ok ? 'circle-check' : 'circle',
    size: 15
  }), " ", label);
}
window.DeskScreens = {
  LoginScreen,
  TodayView,
  ArrivalsView,
  ReservationBody
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/the-desk/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/the-desk/shell.jsx
try { (() => {
/* The Desk — app shell: Icon, TopBar, Rail, CommandPalette, Drawer.
   Composes Atrium primitives from the compiled bundle; the shell chrome is product-specific. */
const {
  Button,
  Input,
  Badge,
  Avatar,
  Kbd
} = window.AtriumVelaDesignSystem_ec9d90;
const {
  useState,
  useEffect,
  useRef
} = React;

/* Lucide icon — rendered declaratively (React owns the markup). Never use lucide.createIcons():
   it replaces React-owned nodes and crashes reconciliation. */
const deskPascal = n => n.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
function deskLucideSvg(name, size) {
  const L = window.lucide;
  if (!L) return '';
  const p = deskPascal(name);
  const node = L.icons && L.icons[p] || L[p];
  if (!node) return '';
  try {
    if (L.createElement) {
      const el = L.createElement(node);
      el.setAttribute('width', String(size));
      el.setAttribute('height', String(size));
      el.setAttribute('stroke-width', '1.5');
      return el.outerHTML;
    }
  } catch (e) {/* fall through */}
  if (Array.isArray(node)) {
    const kids = node.map(([t, a]) => '<' + t + ' ' + Object.entries(a || {}).map(([k, v]) => k + '="' + v + '"').join(' ') + '/>').join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + kids + '</svg>';
  }
  return '';
}
function Icon({
  name,
  size = 16,
  className = '',
  style
}) {
  const html = React.useMemo(() => deskLucideSvg(name, size), [name, size]);
  return /*#__PURE__*/React.createElement("i", {
    className: className,
    "aria-hidden": "true",
    style: {
      width: size,
      height: size,
      display: 'inline-flex',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: html
    }
  });
}
function refreshIcons() {/* no-op — icons render declaratively */}

/* ── Top bar (56px) ──────────────────────────────────────────────────────── */
function TopBar({
  me,
  property,
  properties,
  onProperty,
  theme,
  onToggleTheme,
  onOpenK,
  onCreate
}) {
  const [propOpen, setPropOpen] = useState(false);
  const initials = me.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("header", {
    className: "desk-topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/vela-mark.svg",
    width: "26",
    height: "26",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-display",
    style: {
      fontSize: 18,
      fontWeight: 600
    }
  }, "Vela")), /*#__PURE__*/React.createElement("div", {
    className: "desk-prop"
  }, /*#__PURE__*/React.createElement("button", {
    className: "desk-chip",
    onClick: () => setPropOpen(o => !o)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "building-2",
    size: 15,
    style: {
      color: 'var(--ink-tertiary)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 500,
      maxWidth: 180,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, property.name), /*#__PURE__*/React.createElement(Kbd, null, "\u2318P"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      color: 'var(--ink-tertiary)'
    }
  })), propOpen && /*#__PURE__*/React.createElement("div", {
    className: "desk-menu",
    style: {
      width: 280
    }
  }, properties.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.id,
    className: "desk-menu__item",
    onClick: () => {
      onProperty(p);
      setPropOpen(false);
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    className: "font-mono",
    style: {
      fontSize: 11,
      color: 'var(--ink-tertiary)'
    }
  }, p.code, " \xB7 ", p.currency)), p.id === property.id && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    style: {
      color: 'var(--ink-accent)'
    }
  }))))), /*#__PURE__*/React.createElement("button", {
    className: "desk-search",
    onClick: onOpenK
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textAlign: 'left'
    }
  }, "Search & command\u2026"), /*#__PURE__*/React.createElement(Kbd, null, "\u2318K")), /*#__PURE__*/React.createElement("div", {
    className: "desk-topbar__right"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    onClick: onCreate
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 15
  }), " Create"), /*#__PURE__*/React.createElement("button", {
    className: "desk-iconbtn",
    onClick: onToggleTheme,
    "aria-label": "Toggle theme"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === 'dark' ? 'sun' : 'moon',
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "desk-iconbtn",
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 16
  }), /*#__PURE__*/React.createElement("span", {
    className: "desk-iconbtn__dot"
  })), /*#__PURE__*/React.createElement("span", {
    className: "desk-avatar",
    title: me.email
  }, initials)));
}

/* ── Nav rail (220px) ────────────────────────────────────────────────────── */
const NAV = [{
  id: 'today',
  label: 'Today',
  icon: 'layout-grid'
}, {
  id: 'arrivals',
  label: 'Arrivals',
  icon: 'calendar-check'
}, {
  id: 'inhouse',
  label: 'In-house',
  icon: 'users'
}, {
  id: 'departures',
  label: 'Departures',
  icon: 'door-open'
}, {
  id: 'rack',
  label: 'Rack',
  icon: 'bed-double'
}, {
  id: 'folios',
  label: 'Folios',
  icon: 'receipt'
}, {
  id: 'housekeeping',
  label: 'Housekeeping',
  icon: 'sparkles'
}];
function Rail({
  route,
  onRoute,
  onSignOut
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: "desk-rail"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, NAV.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    className: 'desk-railitem' + (route === item.id ? ' is-active' : ''),
    onClick: () => onRoute(item.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    size: 16
  }), item.label))), /*#__PURE__*/React.createElement("button", {
    className: "desk-railitem desk-railitem--muted",
    onClick: onSignOut
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "log-out",
    size: 16
  }), " Sign out"));
}

/* ── Command palette (⌘K) ────────────────────────────────────────────────── */
function CommandPalette({
  open,
  onClose,
  items
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current && inputRef.current.focus());
    }
  }, [open]);
  if (!open) return null;
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter(it => (it.label + ' ' + (it.group || '') + ' ' + (it.hint || '')).toLowerCase().includes(q)) : items;
  const groups = [];
  filtered.forEach(it => {
    const g = it.group || 'Actions';
    let bucket = groups.find(x => x[0] === g);
    if (!bucket) {
      bucket = [g, []];
      groups.push(bucket);
    }
    bucket[1].push(it);
  });
  const run = it => {
    it.run();
    onClose();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "desk-palette",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Command palette"
  }, /*#__PURE__*/React.createElement("button", {
    className: "desk-scrim",
    "aria-label": "Close",
    tabIndex: -1,
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "desk-palette__panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "desk-palette__field"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18,
    style: {
      color: 'var(--ink-tertiary)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: query,
    placeholder: "Search & command\u2026",
    onChange: e => {
      setQuery(e.target.value);
      setActive(0);
    },
    onKeyDown: e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(a => Math.min(a + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(a => Math.max(a - 1, 0));
      } else if (e.key === 'Enter' && filtered[active]) {
        e.preventDefault();
        run(filtered[active]);
      } else if (e.key === 'Escape') onClose();
    }
  }), /*#__PURE__*/React.createElement(Kbd, null, "esc")), /*#__PURE__*/React.createElement("div", {
    className: "desk-palette__list"
  }, filtered.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "desk-palette__empty"
  }, "No matches for \u201C", query, "\u201D.") : groups.map(([group, gItems]) => /*#__PURE__*/React.createElement("div", {
    key: group,
    style: {
      padding: '0 8px'
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "desk-palette__group"
  }, group), gItems.map(it => {
    const idx = filtered.indexOf(it);
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      className: 'desk-palette__item' + (idx === active ? ' is-active' : ''),
      onMouseMove: () => setActive(idx),
      onClick: () => run(it)
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 16,
      style: {
        color: 'var(--ink-tertiary)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, it.label), it.hint && /*#__PURE__*/React.createElement("span", {
      className: "font-mono",
      style: {
        fontSize: 11,
        color: 'var(--ink-tertiary)'
      }
    }, it.hint));
  }))))));
}

/* ── Right drawer ────────────────────────────────────────────────────────── */
function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "desk-drawer",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("button", {
    className: "desk-scrim",
    "aria-label": "Close",
    tabIndex: -1,
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: "desk-drawer__panel",
    style: {
      width
    }
  }, /*#__PURE__*/React.createElement("header", {
    className: "desk-drawer__head"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "font-display",
    style: {
      margin: 0,
      fontSize: 18,
      fontWeight: 600
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 12,
      color: 'var(--ink-tertiary)'
    },
    className: "font-mono"
  }, description)), /*#__PURE__*/React.createElement("button", {
    className: "desk-iconbtn",
    onClick: onClose,
    "aria-label": "Close drawer"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 16
  }))), /*#__PURE__*/React.createElement("div", {
    className: "desk-drawer__body"
  }, children), footer && /*#__PURE__*/React.createElement("footer", {
    className: "desk-drawer__foot"
  }, footer)));
}
window.DeskShell = {
  Icon,
  refreshIcons,
  TopBar,
  Rail,
  CommandPalette,
  Drawer,
  NAV
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/the-desk/shell.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Kbd = __ds_scope.Kbd;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.MoneyText = __ds_scope.MoneyText;

__ds_ns.PulseBar = __ds_scope.PulseBar;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.GuestCard = __ds_scope.GuestCard;

__ds_ns.ReservationStatusBadge = __ds_scope.ReservationStatusBadge;

__ds_ns.RoomStatusChip = __ds_scope.RoomStatusChip;

})();
