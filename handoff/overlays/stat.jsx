/* ===================================================================
   ANIMATED STAT — 2 variations
   V1 (fidèle) : tampon imprimerie + ligne d'encre, plus dynamique
   V2 (audacieuse) : chiffre monumental qui prend tout le cadre
   =================================================================== */

const { BRAND, interp, clamp, smooth, easeOut, easeOutBack } = window;

/* -------- V1: Stamp Press --------------------------------------- */
function StatStampPress({ frame }) {
  const value = -2.84;
  const target = Math.abs(value);
  const stampScale = interp(frame, [0, 18], [2.4, 1], easeOutBack);
  const stampRot = interp(frame, [0, 22], [-8, -2], easeOut);
  const stampOp = interp(frame, [0, 12], [0, 1]);
  const inkSpread = interp(frame, [10, 40], [0, 1], easeOut);
  const counter = interp(frame, [0, 28], [0, target], smooth);
  const lineW = interp(frame, [22, 60], [0, 1], easeOut);
  const labelLen = "Pétrole WTI sur la séance";
  const labelChars = labelLen.split('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36 }}>
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 18, letterSpacing: '0.32em',
        color: BRAND.colors.inkLight, opacity: interp(frame, [0, 14], [0, 1]),
      }}>VARIATION  D'AUJOURD'HUI</div>

      <div style={{ position: 'relative' }}>
        {/* ink halo */}
        <div style={{
          position: 'absolute', inset: -40,
          background: `radial-gradient(ellipse 60% 40% at 50% 55%, ${BRAND.colors.accentBear}1a, transparent 70%)`,
          opacity: inkSpread, filter: 'blur(20px)',
        }} />
        <div style={{
          transform: `scale(${stampScale}) rotate(${stampRot}deg)`,
          opacity: stampOp,
          transformOrigin: 'center',
          fontFamily: BRAND.fonts.condensed,
          fontSize: 360, lineHeight: 0.85,
          color: BRAND.colors.accentBear,
          letterSpacing: '-0.04em',
          display: 'flex', alignItems: 'baseline', gap: 12,
        }}>
          <span style={{ fontSize: 240 }}>−</span>
          <span>{counter.toFixed(2)}</span>
          <span style={{ fontSize: 220 }}>%</span>
        </div>
      </div>

      <div style={{
        width: 520 * lineW, height: 2, backgroundColor: BRAND.colors.ink,
      }} />

      <div style={{
        fontFamily: BRAND.fonts.display, fontSize: 38, fontStyle: 'italic',
        color: BRAND.colors.inkMid, letterSpacing: '0.005em',
      }}>
        {labelChars.map((c, i) => {
          const op = interp(frame, [40 + i * 1.2, 44 + i * 1.2], [0, 1]);
          return <span key={i} style={{ opacity: op }}>{c}</span>;
        })}
      </div>

      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.18em',
        color: BRAND.colors.inkFaint, marginTop: 8,
        opacity: interp(frame, [70, 90], [0, 1]),
      }}>
        CLÔTURE 17H30  ·  73,18 USD
      </div>
    </div>
  );
}

/* -------- V2: Monumental ---------------------------------------- */
function StatMonumental({ frame }) {
  const value = -2.84;
  const counter = interp(frame, [0, 36], [0, Math.abs(value)], smooth);
  const sliceY = interp(frame, [0, 30], [120, 0], easeOut);
  const wipe = interp(frame, [10, 50], [0, 1], easeOut);

  // Stripe metadata animation
  const stripes = [
    'BRENT  91,2',
    'WTI  73,18',
    'NATURAL GAS  3,82',
    'HEATING OIL  2,67',
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* huge background number */}
      <div style={{
        position: 'absolute', top: -100, left: -60, right: -60,
        fontFamily: BRAND.fonts.condensed,
        fontSize: 1100, lineHeight: 0.78,
        color: BRAND.colors.ink,
        letterSpacing: '-0.06em',
        clipPath: `inset(${100 - wipe * 100}% 0 0 0)`,
        textAlign: 'center',
      }}>
        −{counter.toFixed(2)}<span style={{ color: BRAND.colors.accentBear }}>%</span>
      </div>

      {/* diagonal red stripe */}
      <div style={{
        position: 'absolute',
        top: '54%', left: -200, right: -200, height: 90,
        background: BRAND.colors.accentBear,
        transform: `translateY(${sliceY}px) rotate(-3deg)`,
        opacity: interp(frame, [20, 40], [0, 1]),
        boxShadow: '0 8px 0 rgba(26,22,18,0.18)',
      }} />

      <div style={{
        position: 'absolute', top: '54%', left: 0, right: 0, height: 90,
        transform: 'rotate(-3deg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: BRAND.fonts.condensed, fontSize: 56,
        color: BRAND.colors.cream, letterSpacing: '0.18em',
        opacity: interp(frame, [42, 60], [0, 1]),
        marginTop: sliceY,
      }}>
        PÉTROLE WTI  ·  73,18 USD  ·  CLÔTURE
      </div>

      {/* footer ticker */}
      <div style={{
        position: 'absolute', bottom: 90, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', padding: '0 120px',
        opacity: interp(frame, [80, 110], [0, 1]),
      }}>
        {stripes.map((s, i) => (
          <span key={i} style={{
            fontFamily: BRAND.fonts.mono, fontSize: 18,
            letterSpacing: '0.14em', color: BRAND.colors.inkLight,
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

window.StatStampPress = StatStampPress;
window.StatMonumental = StatMonumental;
