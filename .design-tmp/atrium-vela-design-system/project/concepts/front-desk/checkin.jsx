/* The Desk — Concept · check-in drawer: Verify → Room → Pay → Done. Keyboard-complete. */
(function () {
  const { Button, Badge, Kbd, MoneyText, GuestCard } = window.AtriumVelaDesignSystem_ec9d90;
  const { Icon } = window.FD_Shell;
  const { useState, useEffect } = React;

  const STEPS = ['Verify', 'Room', 'Pay', 'Done'];

  function Stepper({ step }) {
    return (
      <div className="fd-steps" aria-label={'Step ' + (step + 1) + ' of 4'}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <span className="fd-step__bar" />}
            <span className={'fd-step' + (i === step ? ' is-active' : i < step ? ' is-done' : '')}>
              <span className="fd-step__num">{i < step ? '✓' : i + 1}</span>
              {s}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  }

  function CheckinDrawer({ res, suggestions, upsell, onClose, onComplete }) {
    const [step, setStep] = useState(0);
    const [room, setRoom] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
      if (res) { setStep(0); setRoom(res.room || (suggestions[0] && suggestions[0].num)); setBusy(false); }
    }, [res && res.id]);
    useEffect(() => {
      if (!res) return;
      const onKey = (e) => {
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
        setTimeout(() => { setBusy(false); setStep(3); }, 750);
      } else if (step === 3) {
        onComplete(res.id, room);
      } else setStep((s) => s + 1);
    };

    return (
      <div className="fd-drawer" role="dialog" aria-modal="true" aria-label={'Check in ' + res.first + ' ' + res.last}>
        <button className="fd-scrim" tabIndex={-1} aria-label="Close" onClick={onClose} />
        <div className="fd-drawer__panel">
          <header className="fd-drawer__head">
            <div>
              <h2 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Check in — {res.last}, {res.first}</h2>
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{res.conf} · {res.roomType} · {res.nights}N</span>
            </div>
            <Stepper step={step} />
            <button className="fd-iconbtn" onClick={onClose} aria-label="Park draft and close"><Icon name="x" size={16} /></button>
          </header>

          <div className="fd-drawer__body">
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <GuestCard name={res.first + ' ' + res.last} vip={res.vip}
                  summary={`${res.roomType} · ${res.nights} night${res.nights > 1 ? 's' : ''} · ${res.adults} adult${res.adults > 1 ? 's' : ''}${res.children ? ' · ' + res.children + ' child' : ''}`}
                  traits={res.traits} ltv={(Number(res.rate) * res.nights * 6).toFixed(2)} />
                <section>
                  <h3 className="fd-sec">Identity &amp; registration</h3>
                  <div className="fd-verify">
                    <span className="fd-flag is-ok"><Icon name="scan-line" size={15} /> ID scanned — matches profile</span>
                    <span className="fd-flag is-ok"><Icon name="file-pen-line" size={15} /> Reg card e-signed on guest phone</span>
                    <span className={'fd-flag' + (res.paid ? ' is-ok' : '')}>
                      <Icon name="credit-card" size={15} /> {res.paid ? 'Card on file — verified' : 'Payment pending'}
                    </span>
                    <span className="fd-flag is-ok"><Icon name="shield-check" size={15} /> Consent on record (marketing: no)</span>
                  </div>
                </section>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                  Mismatches highlight inline — nothing blocks until payment. <Kbd>Enter</Kbd> continues.
                </p>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 className="fd-sec" style={{ margin: 0 }}>Suggested rooms — gap-optimized, preference-matched</h3>
                {suggestions.map((s, i) => (
                  <button key={s.num} className={'fd-roomopt' + (room === s.num ? ' is-picked' : '')} onClick={() => setRoom(s.num)}>
                    <span className="fd-roomopt__num">{s.num}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13 }}>{s.reason}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: s.ready ? 'var(--status-positive-ink)' : 'var(--status-caution-ink)' }}>
                        {s.ready ? '✓ Inspected — ready now' : 'Queue — guest notified when ready'}
                      </span>
                    </span>
                    {i === 0 && <Badge tone="accent">Suggested</Badge>}
                    {room === s.num && <Icon name="check" size={16} style={{ color: 'var(--ink-accent)' }} />}
                  </button>
                ))}
                {up && (
                  <div className="fd-upsell">
                    <Icon name="arrow-big-up-dash" size={16} />
                    <span style={{ flex: 1 }}>Upgrade to {up.to} — <b>+<MoneyText amount={up.delta} style={{ color: 'inherit' }} />/night</b> · 2 left tonight</span>
                    <Button variant="secondary" size="sm">Offer</Button>
                  </div>
                )}
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)' }}><Kbd>→</Kbd> cycles alternates on the mini-rack.</p>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 className="fd-sec" style={{ margin: 0 }}>Folio preview</h3>
                <div className="fd-ledger">
                  <div className="fd-ledger__row">
                    <span style={{ fontSize: 13 }}>Room {room} — {res.roomType} × {res.nights}N</span>
                    <MoneyText amount={roomTotal} />
                  </div>
                  <div className="fd-ledger__row">
                    <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>Occupancy tax (10%)</span>
                    <MoneyText amount={tax} />
                  </div>
                  {res.paid && (
                    <div className="fd-ledger__row">
                      <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>Deposit — Visa ••42 (auto-applied)</span>
                      <MoneyText amount={'-' + deposit} />
                    </div>
                  )}
                  <div className="fd-ledger__row is-total">
                    <span style={{ fontSize: 13 }}>Due at desk</span>
                    <MoneyText amount={due} />
                  </div>
                </div>
                <div className="fd-verify">
                  <span className="fd-flag is-ok"><Icon name="credit-card" size={15} /> Incidentals — $100 auth on card on file</span>
                  <span className="fd-flag is-ok"><Icon name="receipt-text" size={15} /> Invoice routes to guest folio</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                  {Number(due) === 0 ? 'Nothing to collect — fully settled by deposit.' : 'Tap terminal or use card on file.'}
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="fd-done">
                <span className="fd-done__ring"><Icon name="check" size={30} /></span>
                <h3 className="font-display" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                  {res.first} is in-house — room {room}
                </h3>
                <div className="fd-done__list">
                  <span><Icon name="key-round" size={14} style={{ color: 'var(--status-positive-ink)' }} /> Two keys encoded</span>
                  <span><Icon name="message-square" size={14} style={{ color: 'var(--status-positive-ink)' }} /> Welcome message queued (SMS)</span>
                  <span><Icon name="sparkles" size={14} style={{ color: 'var(--status-positive-ink)' }} /> Housekeeping sees the occupancy flip</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)' }}>Audit row written — actor, before/after, permission.</p>
              </div>
            )}
          </div>

          <footer className="fd-drawer__foot">
            <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
              <Kbd>esc</Kbd> parks the draft — resumable from Needs attention
            </span>
            <span style={{ flex: 1 }} />
            {step > 0 && step < 3 && <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button>}
            <Button onClick={advance} loading={busy}>
              {step === 0 ? 'Verified — choose room' : step === 1 ? 'Room ' + (room || '—') + ' — to payment'
                : step === 2 ? (Number(due) === 0 ? 'Complete check-in' : 'Collect & complete') : 'Close'}
              {step < 3 && <Icon name="arrow-right" size={14} />}
            </Button>
          </footer>
        </div>
      </div>
    );
  }

  window.FD_Checkin = { CheckinDrawer };
})();
