/* ===================================================================
   CAUSAL CHAIN — 2 variations
   V1 (fidèle++) : timeline horizontale typographique avec ink trace
   V2 (audacieuse) : domino schéma éditorial, blocs + flèches manuscrites
   =================================================================== */

const { BRAND, interp, clamp, smooth, easeOut, easeOutBack } = window;

const STEPS = [
  { tag: '1', label: 'La Fed maintient ses taux', sub: 'FOMC 18:00' },
  { tag: '2', label: 'Le dollar grimpe',           sub: 'DXY +0,8%' },
  { tag: '3', label: 'L\'or recule',               sub: 'XAU −1,4%' },
  { tag: '4', label: 'Bitcoin sous pression',      sub: 'BTC −2,1%' },
];

/* -------- V1: Editorial Timeline -------------------------------- */
function CausalTimeline({ frame }) {
  return (
    <div style={{
      width: 1500, display: 'flex', flexDirection: 'column', gap: 28,
    }}>
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.3em',
        color: BRAND.colors.inkLight, paddingBottom: 14,
        borderBottom: `1px solid ${BRAND.colors.rule}`,
        opacity: interp(frame, [0, 12], [0, 1]),
      }}>L'EFFET DOMINO  ·  MARDI 17H</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        position: 'relative', gap: 0,
      }}>
        {/* ink line */}
        <div style={{
          position: 'absolute', top: 56, left: '6%', right: '6%', height: 2,
          background: BRAND.colors.ink,
          transform: `scaleX(${interp(frame, [10, 70], [0, 1], easeOut)})`,
          transformOrigin: 'left',
        }} />

        {STEPS.map((s, i) => {
          const start = 16 + i * 14;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const ty = interp(frame, [start, start + 18], [22, 0], easeOut);
          const dotR = interp(frame, [start + 4, start + 16], [0, 14], easeOutBack);
          return (
            <div key={i} style={{
              opacity: op, transform: `translateY(${ty}px)`,
              padding: '0 22px',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14,
            }}>
              {/* tag */}
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 13, letterSpacing: '0.25em',
                color: BRAND.colors.inkLight,
              }}>ÉTAPE {s.tag}</div>

              {/* dot */}
              <svg width={32} height={32} style={{ marginLeft: -10 }}>
                <circle cx={16} cy={16} r={dotR} fill={BRAND.colors.accentDefault} />
                <circle cx={16} cy={16} r={5} fill={BRAND.colors.cream} />
              </svg>

              <div style={{
                fontFamily: BRAND.fonts.display, fontSize: 32, fontStyle: 'italic',
                fontWeight: 700, color: BRAND.colors.ink, lineHeight: 1.2,
              }}>{s.label}</div>

              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.12em',
                color: BRAND.colors.accentDefault, paddingTop: 4,
                borderTop: `1px solid ${BRAND.colors.rule}`,
                width: '100%',
                opacity: interp(frame, [start + 14, start + 24], [0, 1]),
              }}>{s.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------- V2: Domino Diagram ------------------------------------ */
function CausalDomino({ frame }) {
  return (
    <div style={{
      width: 1480, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18,
    }}>
      <div style={{
        fontFamily: BRAND.fonts.display, fontStyle: 'italic',
        fontSize: 56, color: BRAND.colors.ink, fontWeight: 700,
        opacity: interp(frame, [0, 16], [0, 1]),
        transform: `translateY(${interp(frame, [0, 20], [-20, 0], easeOut)}px)`,
      }}>Comment la Fed a fait tomber l'or</div>
      <div style={{
        width: interp(frame, [10, 40], [0, 320], easeOut), height: 4,
        background: BRAND.colors.accentDefault, marginBottom: 24,
      }} />

      <div style={{
        position: 'relative', display: 'flex', alignItems: 'stretch', gap: 0,
      }}>
        {STEPS.map((s, i) => {
          const start = 18 + i * 16;
          const sl = interp(frame, [start, start + 18], [-60, 0], easeOutBack);
          const op = interp(frame, [start, start + 12], [0, 1]);
          const arrowProg = interp(frame, [start + 10, start + 24], [0, 1], easeOut);
          const isLast = i === STEPS.length - 1;
          const tilt = i % 2 === 0 ? -1.2 : 1.2;
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: op,
                transform: `translateX(${sl}px) rotate(${tilt}deg)`,
                width: 280, padding: '24px 22px',
                background: BRAND.colors.cream,
                border: `2px solid ${BRAND.colors.ink}`,
                boxShadow: `8px 8px 0 ${BRAND.colors.ink}`,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 56,
                  color: BRAND.colors.accentDefault, lineHeight: 0.9,
                }}>0{s.tag}</div>
                <div style={{
                  fontFamily: BRAND.fonts.display, fontStyle: 'italic',
                  fontWeight: 700, fontSize: 24, color: BRAND.colors.ink,
                  lineHeight: 1.25,
                }}>{s.label}</div>
                <div style={{
                  fontFamily: BRAND.fonts.mono, fontSize: 13,
                  letterSpacing: '0.14em', color: BRAND.colors.accentDefault,
                  paddingTop: 6, borderTop: `1px dashed ${BRAND.colors.rule}`,
                }}>{s.sub}</div>
              </div>

              {!isLast && (
                <div style={{
                  width: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={70} height={40} viewBox="0 0 70 40">
                    <defs>
                      <marker id={`ar${i}`} viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M0,0 L10,5 L0,10 z" fill={BRAND.colors.ink} />
                      </marker>
                    </defs>
                    <path
                      d={`M 4 20 Q 35 ${i % 2 === 0 ? -2 : 42} 64 20`}
                      stroke={BRAND.colors.ink} strokeWidth={2.5}
                      fill="none" strokeLinecap="round"
                      strokeDasharray={120}
                      strokeDashoffset={120 - arrowProg * 120}
                      markerEnd={`url(#ar${i})`}
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* hand-written annotation */}
      <div style={{
        marginTop: 30, marginLeft: 80, transform: 'rotate(-2deg)',
        opacity: interp(frame, [110, 130], [0, 1]),
      }}>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic',
          fontSize: 28, color: BRAND.colors.accentDefault,
          borderBottom: `2px solid ${BRAND.colors.accentDefault}`,
          paddingBottom: 4,
        }}>↳ et le bitcoin a suivi, comme prévu.</span>
      </div>
    </div>
  );
}

window.CausalTimeline = CausalTimeline;
window.CausalDomino = CausalDomino;
