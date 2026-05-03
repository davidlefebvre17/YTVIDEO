/* ===================================================================
   GAUGE — 2 variations    +    HEATMAP — 2 variations    +    MULTI-ASSET — 2 variations
   =================================================================== */

const { BRAND, interp, clamp, smooth, easeOut, easeOutBack } = window;

/* =========== GAUGE V1: Big Editorial Meter ====================== */
function GaugeBigMeter({ frame }) {
  const value = 78;
  const animVal = interp(frame, [0, 50], [0, value], smooth);
  const angle = (animVal / 100) * 180;
  const r = 360, cx = 480, cy = 420, sw = 36;
  const rad = (Math.PI * (180 - angle)) / 180;
  const ex = cx + r * Math.cos(rad), ey = cy - r * Math.sin(rad);
  const largeArc = angle > 90 ? 1 : 0;
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const valPath = angle > 0 ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}` : '';
  const ndR = r - 60;
  const nx = cx + ndR * Math.cos(rad), ny = cy - ndR * Math.sin(rad);

  const ticks = Array.from({ length: 21 }, (_, i) => {
    const a = (i / 20) * 180;
    const rd = (Math.PI * (180 - a)) / 180;
    const big = i % 5 === 0;
    return {
      x1: cx + (r + 12) * Math.cos(rd), y1: cy - (r + 12) * Math.sin(rd),
      x2: cx + (r + (big ? 30 : 22)) * Math.cos(rd),
      y2: cy - (r + (big ? 30 : 22)) * Math.sin(rd), big,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 20, letterSpacing: '0.32em',
        color: BRAND.colors.inkLight, opacity: interp(frame, [0, 14], [0, 1]),
      }}>FEAR &amp; GREED INDEX  ·  S&amp;P 500</div>

      <svg width={1000} height={520} viewBox="0 0 960 520">
        <path d={bgPath} fill="none" stroke={BRAND.colors.inkFaint} strokeWidth={sw} strokeLinecap="butt" />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={BRAND.colors.inkLight} strokeWidth={t.big ? 3 : 1.2} />
        ))}
        {[
          { a: 162, t: 'PEUR EXTRÊME', c: BRAND.colors.accentBear },
          { a: 126, t: 'PEUR', c: BRAND.colors.accentBear },
          { a: 90,  t: 'NEUTRE', c: BRAND.colors.inkLight },
          { a: 54,  t: 'AVIDITÉ', c: BRAND.colors.accentBull },
          { a: 18,  t: 'EUPHORIE', c: BRAND.colors.accentBull },
        ].map((z, i) => {
          const rd = (Math.PI * z.a) / 180;
          return (
            <text key={i}
              x={cx + (r + 70) * Math.cos(rd)}
              y={cy - (r + 70) * Math.sin(rd)}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily={BRAND.fonts.mono} fontSize={15}
              letterSpacing="0.18em" fill={z.c}>{z.t}</text>
          );
        })}
        {valPath && (
          <path d={valPath} fill="none" stroke={BRAND.colors.accentBull}
            strokeWidth={sw} strokeLinecap="butt" />
        )}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={BRAND.colors.ink} strokeWidth={5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={16} fill={BRAND.colors.ink} />
        <circle cx={cx} cy={cy} r={6} fill={BRAND.colors.cream} />
      </svg>

      <div style={{
        marginTop: -160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 220,
          color: BRAND.colors.accentBull, lineHeight: 0.85,
          transform: `scale(${interp(frame, [40, 56], [1.4, 1], easeOutBack)})`,
          opacity: interp(frame, [40, 50], [0, 1]),
        }}>{Math.round(animVal)}</div>
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontSize: 32,
          color: BRAND.colors.inkMid,
          opacity: interp(frame, [60, 76], [0, 1]),
        }}>« le marché est en mode avidité »</div>
      </div>
    </div>
  );
}

/* =========== GAUGE V2: Linear Strip Gauge ======================= */
function GaugeStrip({ frame }) {
  const value = 78;
  const animVal = interp(frame, [10, 60], [0, value], smooth);
  const w = 1500, h = 90;
  const cellCount = 50;
  const cellW = w / cellCount;
  const litCells = Math.round((animVal / 100) * cellCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.3em',
        color: BRAND.colors.inkLight,
        opacity: interp(frame, [0, 12], [0, 1]),
      }}>SENTIMENT  ·  S&amp;P 500  ·  17H30</div>

      <div style={{
        fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
        fontSize: 92, color: BRAND.colors.ink, lineHeight: 1,
        opacity: interp(frame, [4, 20], [0, 1]),
        transform: `translateX(${interp(frame, [4, 20], [-20, 0], easeOut)}px)`,
      }}>Avidité.</div>

      <div style={{ position: 'relative', width: w, marginTop: 12 }}>
        <svg width={w} height={h + 60}>
          {Array.from({ length: cellCount }).map((_, i) => {
            const lit = i < litCells;
            const t = i / cellCount;
            const color = t < 0.25 ? BRAND.colors.accentBear
              : t < 0.5 ? '#8b4a1a'
              : t < 0.75 ? BRAND.colors.accentWarning
              : BRAND.colors.accentBull;
            const delay = i * 0.6;
            const cellOp = interp(frame, [10 + delay, 14 + delay], [0, 1]);
            return (
              <rect key={i}
                x={i * cellW + 2} y={0}
                width={cellW - 4} height={h}
                fill={lit ? color : BRAND.colors.creamDark}
                stroke={BRAND.colors.rule} strokeWidth={0.5}
                opacity={cellOp} />
            );
          })}
          {/* needle */}
          <g transform={`translate(${(animVal / 100) * w}, 0)`}>
            <polygon points={`0,${h + 4} -10,${h + 24} 10,${h + 24}`}
              fill={BRAND.colors.ink}
              opacity={interp(frame, [40, 56], [0, 1])} />
            <line x1={0} y1={-10} x2={0} y2={h + 4}
              stroke={BRAND.colors.ink} strokeWidth={3}
              opacity={interp(frame, [40, 56], [0, 1])} />
          </g>
        </svg>
        <div style={{
          position: 'absolute',
          left: `${(animVal / 100) * 100}%`, top: -54,
          transform: 'translateX(-50%)',
          fontFamily: BRAND.fonts.condensed, fontSize: 64,
          color: BRAND.colors.ink,
          opacity: interp(frame, [44, 60], [0, 1]),
        }}>{Math.round(animVal)}</div>

        {/* scale labels */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.16em',
          color: BRAND.colors.inkLight, marginTop: 20,
          opacity: interp(frame, [60, 76], [0, 1]),
        }}>
          <span>0  PEUR EXTRÊME</span>
          <span>25  PEUR</span>
          <span>50  NEUTRE</span>
          <span>75  AVIDITÉ</span>
          <span>EUPHORIE  100</span>
        </div>
      </div>

      <div style={{
        fontFamily: BRAND.fonts.body, fontStyle: 'italic', fontSize: 26,
        color: BRAND.colors.inkMid, marginTop: 20, maxWidth: 1100,
        borderLeft: `3px solid ${BRAND.colors.accentBull}`, paddingLeft: 18,
        opacity: interp(frame, [80, 100], [0, 1]),
      }}>+8 points en une semaine — l'optimisme reprend la main, mais l'on s'approche dangereusement de l'euphorie.</div>
    </div>
  );
}

/* =========== HEATMAP V1: Newspaper Page Layout ================== */
const SECTORS = [
  { ticker: 'TECH', name: 'Technologie', change: 2.4 },
  { ticker: 'FIN',  name: 'Finance',     change: 1.8 },
  { ticker: 'CONS', name: 'Consommation', change: 0.9 },
  { ticker: 'IND',  name: 'Industrie',   change: 0.4 },
  { ticker: 'HEAL', name: 'Santé',       change: -0.3 },
  { ticker: 'UTIL', name: 'Utilities',   change: -0.7 },
  { ticker: 'ENRG', name: 'Énergie',     change: -1.6 },
  { ticker: 'MAT',  name: 'Matériaux',   change: -2.8 },
];
const colorFor = (c) =>
  c >= 1.5 ? BRAND.colors.accentBull
  : c >= 0 ? '#3d7a4f'
  : c >= -1 ? '#8b4a1a'
  : BRAND.colors.accentBear;

function HeatmapPage({ frame }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 1600 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        borderBottom: `3px solid ${BRAND.colors.ink}`, paddingBottom: 12,
        opacity: interp(frame, [0, 14], [0, 1]),
      }}>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
          fontSize: 64, color: BRAND.colors.ink,
        }}>Le palmarès du jour</span>
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.2em',
          color: BRAND.colors.inkLight,
        }}>S&amp;P 500  ·  PAR SECTEUR  ·  CLÔTURE</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
      }}>
        {SECTORS.map((s, i) => {
          const start = 10 + i * 5;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const ty = interp(frame, [start, start + 16], [30, 0], easeOut);
          const fill = interp(frame, [start + 8, start + 24], [0, Math.abs(s.change) / 3], easeOut);
          const color = colorFor(s.change);
          return (
            <div key={i} style={{
              opacity: op, transform: `translateY(${ty}px)`,
              padding: '20px 24px',
              background: BRAND.colors.cream,
              border: `1.5px solid ${BRAND.colors.ink}`,
              position: 'relative', overflow: 'hidden',
              minHeight: 200,
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: color, opacity: fill * 0.18,
                pointerEvents: 'none',
              }} />
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.2em',
                  color: BRAND.colors.inkLight,
                }}>RANG {String(i + 1).padStart(2, '0')}</div>
                <div style={{
                  fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
                  fontSize: 32, color: BRAND.colors.ink, lineHeight: 1.1,
                }}>{s.name}</div>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 64,
                  color, lineHeight: 0.95, marginTop: 6,
                }}>
                  {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
                </div>
                <div style={{
                  fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.18em',
                  color: BRAND.colors.inkLight, marginTop: 6,
                }}>{s.ticker}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========== HEATMAP V2: Bar Race ============================== */
function HeatmapBarRace({ frame }) {
  const sorted = [...SECTORS].sort((a, b) => b.change - a.change);
  const maxAbs = 3;
  return (
    <div style={{ width: 1500, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
        fontSize: 56, color: BRAND.colors.ink,
        opacity: interp(frame, [0, 14], [0, 1]),
        transform: `translateY(${interp(frame, [0, 18], [-16, 0], easeOut)}px)`,
      }}>Onze secteurs, deux camps.</div>
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.22em',
        color: BRAND.colors.inkLight, marginBottom: 16,
        borderBottom: `1px solid ${BRAND.colors.rule}`, paddingBottom: 10,
        opacity: interp(frame, [4, 18], [0, 1]),
      }}>VARIATION INTRADAY  ·  S&amp;P 500</div>

      <div style={{ position: 'relative' }}>
        {/* center axis */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2,
          background: BRAND.colors.ink,
          opacity: interp(frame, [10, 22], [0, 1]),
        }} />
        {sorted.map((s, i) => {
          const start = 14 + i * 5;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const barW = interp(frame, [start, start + 22], [0, Math.abs(s.change) / maxAbs * 600], easeOut);
          const color = colorFor(s.change);
          const isUp = s.change >= 0;
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 200px 1fr',
              alignItems: 'center', height: 64,
              borderBottom: `1px dashed ${BRAND.colors.rule}`,
              opacity: op,
            }}>
              {/* left: name (right aligned for negative bars to read into center) */}
              <div style={{
                textAlign: 'right', paddingRight: 24,
                fontFamily: BRAND.fonts.display, fontStyle: 'italic',
                fontSize: 26, color: BRAND.colors.ink, fontWeight: 700,
                visibility: isUp ? 'hidden' : 'visible',
              }}>{s.name}</div>
              {/* center column reserved for value + ticker */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: BRAND.fonts.mono, fontSize: 13, letterSpacing: '0.14em',
                color: BRAND.colors.inkLight,
              }}>{s.ticker}</div>
              <div style={{
                fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontSize: 26,
                fontWeight: 700, color: BRAND.colors.ink,
                visibility: isUp ? 'visible' : 'hidden',
                paddingLeft: 24,
              }}>{s.name}</div>
              {/* bar overlay */}
              <div style={{
                position: 'absolute', left: '50%', height: 38,
                width: barW, background: color,
                transform: isUp ? 'translateX(0)' : `translateX(${-barW}px)`,
                marginTop: 13,
                display: 'flex', alignItems: 'center',
                justifyContent: isUp ? 'flex-end' : 'flex-start',
                paddingLeft: 14, paddingRight: 14,
                fontFamily: BRAND.fonts.condensed, fontSize: 32,
                color: BRAND.colors.cream, letterSpacing: '0.04em',
              }}>
                {isUp ? '+' : ''}{s.change.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========== MULTI-ASSET V1: Stock Tape ========================== */
const ASSETS = [
  { sym: 'CAC', name: 'CAC 40',     price: 7842,    pct:  0.62 },
  { sym: 'SPX', name: 'S&P 500',    price: 5471.18, pct:  1.14 },
  { sym: 'NDX', name: 'Nasdaq 100', price: 19320,   pct:  1.82 },
  { sym: 'GLD', name: 'Or',         price: 2348,    pct: -0.74 },
  { sym: 'BTC', name: 'Bitcoin',    price: 67840,   pct: -2.10 },
  { sym: 'WTI', name: 'Pétrole',    price: 73.18,   pct: -2.84 },
];

function MultiTape({ frame }) {
  return (
    <div style={{ width: 1600, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        borderBottom: `3px double ${BRAND.colors.ink}`, paddingBottom: 14,
        opacity: interp(frame, [0, 14], [0, 1]),
      }}>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
          fontSize: 56, color: BRAND.colors.ink,
        }}>Sur les marchés ce soir</span>
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.22em',
          color: BRAND.colors.inkLight,
        }}>17:30 CET  ·  TICKER GÉNÉRAL</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
      }}>
        {ASSETS.map((a, i) => {
          const start = 12 + i * 6;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const ty = interp(frame, [start, start + 18], [24, 0], easeOut);
          const lineW = interp(frame, [start + 12, start + 28], [0, 1], easeOut);
          const color = a.pct >= 0 ? BRAND.colors.accentBull : BRAND.colors.accentBear;
          const sign = a.pct >= 0 ? '+' : '';
          return (
            <div key={i} style={{
              opacity: op, transform: `translateY(${ty}px)`,
              padding: '32px 28px',
              borderRight: i % 3 < 2 ? `1px solid ${BRAND.colors.rule}` : 'none',
              borderBottom: i < 3 ? `1px solid ${BRAND.colors.rule}` : 'none',
              position: 'relative',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.22em',
                color: BRAND.colors.inkLight,
              }}>{a.sym}</div>
              <div style={{
                fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontSize: 36,
                fontWeight: 700, color: BRAND.colors.ink,
              }}>{a.name}</div>
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 64,
                color: BRAND.colors.ink, lineHeight: 1, marginTop: 8,
              }}>{a.price.toLocaleString('fr-FR')}</div>
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 36, color, lineHeight: 1,
              }}>
                {sign}{a.pct.toFixed(2)}%  {a.pct >= 0 ? '↑' : '↓'}
              </div>
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                width: `${lineW * 100}%`, height: 4,
                background: color,
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========== MULTI-ASSET V2: Vertical Sparklines ================ */
function MultiSparklines({ frame }) {
  const seed = (s, n) => {
    const out = [];
    let v = 0;
    for (let i = 0; i < n; i++) {
      const r = Math.sin(s * 13 + i * 0.7) * Math.cos(s * 7 + i * 0.4);
      v += r * 6 + (s * 0.2);
      out.push(v);
    }
    return out;
  };
  return (
    <div style={{ width: 1600, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.28em',
        color: BRAND.colors.inkLight,
        opacity: interp(frame, [0, 12], [0, 1]),
        borderBottom: `1px solid ${BRAND.colors.rule}`, paddingBottom: 10,
      }}>L'INTRADAY EN COUP D'ŒIL  ·  6 ACTIFS  ·  09:00 — 17:30</div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16,
      }}>
        {ASSETS.map((a, i) => {
          const start = 12 + i * 8;
          const op = interp(frame, [start, start + 14], [0, 1]);
          const draw = interp(frame, [start + 4, start + 50], [0, 1], easeOut);
          const counter = interp(frame, [start + 6, start + 36], [0, a.pct], smooth);
          const color = a.pct >= 0 ? BRAND.colors.accentBull : BRAND.colors.accentBear;
          const pts = seed(i + 1, 40);
          const minV = Math.min(...pts), maxV = Math.max(...pts);
          const rng = maxV - minV || 1;
          const W = 220, H = 120;
          const path = pts.map((v, idx) => {
            const x = (idx / (pts.length - 1)) * W;
            const y = H - ((v - minV) / rng) * H;
            return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
          }).join(' ');
          const totalLen = 600;
          return (
            <div key={i} style={{
              opacity: op, padding: '20px 18px',
              background: BRAND.colors.cream,
              border: `1.5px solid ${BRAND.colors.ink}`,
              display: 'flex', flexDirection: 'column', gap: 10,
              minHeight: 360,
            }}>
              <div style={{
                fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.2em',
                color: BRAND.colors.inkLight,
              }}>{a.sym}</div>
              <div style={{
                fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontSize: 24,
                fontWeight: 700, color: BRAND.colors.ink, lineHeight: 1.1,
              }}>{a.name}</div>

              <svg width={W} height={H} style={{ marginTop: 6 }}>
                <line x1={0} y1={H * 0.55} x2={W} y2={H * 0.55}
                  stroke={BRAND.colors.inkFaint} strokeWidth={1} strokeDasharray="3 3" />
                <path d={path} fill="none" stroke={color} strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeDasharray={totalLen}
                  strokeDashoffset={totalLen * (1 - draw)} />
              </svg>

              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 38, color: BRAND.colors.ink, lineHeight: 1,
              }}>{a.price.toLocaleString('fr-FR')}</div>
              <div style={{
                fontFamily: BRAND.fonts.condensed, fontSize: 26, color, lineHeight: 1,
              }}>
                {counter >= 0 ? '+' : ''}{counter.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.GaugeBigMeter = GaugeBigMeter;
window.GaugeStrip = GaugeStrip;
window.HeatmapPage = HeatmapPage;
window.HeatmapBarRace = HeatmapBarRace;
window.MultiTape = MultiTape;
window.MultiSparklines = MultiSparklines;
