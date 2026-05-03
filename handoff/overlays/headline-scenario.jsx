/* ===================================================================
   HEADLINE — 2 variations    +    SCENARIO FORK — 2 variations
   =================================================================== */

const { BRAND, interp, clamp, smooth, easeOut, easeOutBack } = window;

/* =========== HEADLINE V1: Front Page Splash ===================== */
function HeadlineFrontPage({ frame }) {
  const barW = interp(frame, [0, 24], [0, 1], easeOut);
  const stampScale = interp(frame, [4, 18], [1.6, 1], easeOutBack);
  const stampOp = interp(frame, [4, 16], [0, 1]);
  const titleOp = interp(frame, [16, 32], [0, 1]);
  const titleY = interp(frame, [16, 32], [22, 0], easeOut);
  const detailOp = interp(frame, [30, 50], [0, 1]);
  const ruleW = interp(frame, [44, 70], [0, 1], easeOut);

  return (
    <div style={{ width: 1600, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{
          width: 540, height: 8, background: BRAND.colors.accentBear,
          transform: `scaleX(${barW})`, transformOrigin: 'left',
        }} />
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.32em',
          color: BRAND.colors.accentBear,
          opacity: interp(frame, [12, 24], [0, 1]),
        }}>BREAKING</div>
      </div>

      <div style={{
        transform: `scale(${stampScale})`, opacity: stampOp,
        transformOrigin: 'left',
      }}>
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 18, letterSpacing: '0.18em',
          color: BRAND.colors.accentBear, fontWeight: 700,
          padding: '6px 16px',
          border: `2px solid ${BRAND.colors.accentBear}`,
          background: `${BRAND.colors.accentBear}10`,
        }}>BLOOMBERG  ·  17:42</span>
      </div>

      <div style={{
        opacity: titleOp,
        transform: `translateY(${titleY}px)`,
        fontFamily: BRAND.fonts.display, fontStyle: 'italic',
        fontSize: 110, fontWeight: 800,
        color: BRAND.colors.ink, lineHeight: 1.05,
        textWrap: 'balance',
      }}>La Banque Centrale Européenne baisse ses taux de 25&nbsp;points</div>

      <div style={{
        width: `${ruleW * 100}%`, height: 1, background: BRAND.colors.ink, marginTop: 14,
      }} />

      <div style={{
        opacity: detailOp,
        transform: `translateY(${interp(frame, [30, 50], [12, 0], easeOut)}px)`,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32,
        marginTop: 6,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.body, fontStyle: 'italic',
          fontSize: 28, lineHeight: 1.45, color: BRAND.colors.inkMid,
          borderLeft: `3px solid ${BRAND.colors.accentBear}`, paddingLeft: 16,
        }}>Première baisse depuis 2019. Les marchés actions saluent, l'euro recule de 0,4% face au dollar.</div>
        <div style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 96,
          color: BRAND.colors.accentBear, lineHeight: 0.95,
        }}>−25<span style={{ fontSize: 56 }}>pb</span></div>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.16em',
          color: BRAND.colors.inkLight, lineHeight: 1.8,
        }}>
          TAUX DIRECTEUR  4,25% → 4,00%<br/>
          PROCHAINE RÉUNION  18 SEP<br/>
          MARCHÉ OBLIG.  −12 PB<br/>
          EUR/USD  1,0852 ↓
        </div>
      </div>
    </div>
  );
}

/* =========== HEADLINE V2: Tabloid Slam ========================== */
function HeadlineTabloid({ frame }) {
  const slamY = interp(frame, [0, 14], [-200, 0], easeOutBack);
  const slamOp = interp(frame, [0, 8], [0, 1]);
  const shake = Math.sin(frame * 0.5) * interp(frame, [14, 30], [4, 0]);
  const flashOp = interp(frame, [12, 22], [0.55, 0]);
  const subY = interp(frame, [22, 42], [40, 0], easeOut);
  const subOp = interp(frame, [22, 42], [0, 1]);

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 80px',
    }}>
      {/* white flash */}
      <div style={{
        position: 'absolute', inset: 0, background: BRAND.colors.cream,
        opacity: flashOp, pointerEvents: 'none',
      }} />

      {/* top kicker */}
      <div style={{
        position: 'absolute', top: 80, left: 80,
        display: 'flex', alignItems: 'center', gap: 18,
        opacity: interp(frame, [50, 64], [0, 1]),
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: BRAND.colors.accentBear,
          animation: 'pulse 1.4s infinite',
        }} />
        <span style={{
          fontFamily: BRAND.fonts.mono, fontSize: 18, letterSpacing: '0.32em',
          color: BRAND.colors.accentBear,
        }}>EN DIRECT  ·  BLOOMBERG  ·  17:42</span>
      </div>

      {/* slam title */}
      <div style={{
        transform: `translate(${shake}px, ${slamY}px)`,
        opacity: slamOp,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.condensed,
          fontSize: 280, lineHeight: 0.85,
          color: BRAND.colors.ink,
          letterSpacing: '-0.02em',
        }}>LA BCE</div>
        <div style={{
          fontFamily: BRAND.fonts.condensed,
          fontSize: 280, lineHeight: 0.85,
          color: BRAND.colors.accentBear,
          letterSpacing: '-0.02em',
          marginLeft: 80,
        }}>BAISSE.</div>
      </div>

      {/* sub */}
      <div style={{
        marginTop: 40,
        transform: `translateY(${subY}px)`, opacity: subOp,
        display: 'flex', alignItems: 'center', gap: 32,
      }}>
        <span style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 96,
          color: BRAND.colors.ink, letterSpacing: '0.04em',
          background: BRAND.colors.accentWarning,
          padding: '4px 24px',
        }}>−25 PB</span>
        <span style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic',
          fontSize: 44, color: BRAND.colors.inkMid, lineHeight: 1.1, maxWidth: 700,
        }}>première fois depuis 2019. l'euro encaisse, les actions célèbrent.</span>
      </div>
    </div>
  );
}

/* =========== SCENARIO V1: Battle Diptych ======================== */
function ScenarioBattle({ frame }) {
  return (
    <div style={{
      width: 1600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
    }}>
      <div style={{
        fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.32em',
        color: BRAND.colors.inkLight,
        opacity: interp(frame, [0, 12], [0, 1]),
      }}>LE VERDICT  ·  S&amp;P 500  ·  D'ICI VENDREDI</div>

      <div style={{
        fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
        fontSize: 64, color: BRAND.colors.ink, textAlign: 'center', lineHeight: 1.15,
        opacity: interp(frame, [4, 22], [0, 1]),
        transform: `scale(${interp(frame, [4, 22], [0.92, 1], easeOutBack)})`,
        maxWidth: 1300,
      }}>L'inflation US peut-elle encore repartir&nbsp;?</div>
      <div style={{
        width: interp(frame, [16, 36], [0, 380], easeOut), height: 3,
        background: BRAND.colors.ink,
      }} />

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 0,
        width: '100%', marginTop: 30,
      }}>
        {[
          { kind: 'bull', label: 'HAUSSIER', color: BRAND.colors.accentBull,
            cond: 'Si l\'IPC s\'établit sous 3,1%, la Fed enchaînera deux baisses.',
            target: '5 850',
            delta: '+6,9%',
            prob: 62,
            dir: 'left',
          },
          null,
          { kind: 'bear', label: 'BAISSIER', color: BRAND.colors.accentBear,
            cond: 'Au-dessus de 3,4%, le scénario du « higher for longer » revient.',
            target: '5 180',
            delta: '−5,4%',
            prob: 38,
            dir: 'right',
          },
        ].map((p, i) => {
          if (!p) {
            const dh = interp(frame, [22, 50], [0, 320], easeOut);
            const dop = interp(frame, [22, 38], [0, 1]);
            return (
              <div key={i} style={{
                width: 80, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
              }}>
                <div style={{
                  width: 1, height: dh,
                  background: BRAND.colors.rule, opacity: dop,
                  marginTop: 24,
                }} />
                <div style={{
                  position: 'absolute', top: 140,
                  width: 56, height: 56, borderRadius: '50%',
                  background: BRAND.colors.cream, border: `2px solid ${BRAND.colors.ink}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: dop,
                }}>
                  <span style={{
                    fontFamily: BRAND.fonts.mono, fontSize: 16, letterSpacing: '0.1em',
                    color: BRAND.colors.ink,
                  }}>OU</span>
                </div>
              </div>
            );
          }
          const start = p.dir === 'left' ? 28 : 36;
          const sl = interp(frame, [start, start + 18], [p.dir === 'left' ? -100 : 100, 0], easeOutBack);
          const op = interp(frame, [start, start + 14], [0, 1]);
          const targStart = 60 + (p.dir === 'left' ? 0 : 6);
          const tScale = interp(frame, [targStart, targStart + 14], [1.4, 1], easeOutBack);
          const tOp = interp(frame, [targStart, targStart + 10], [0, 1]);
          const probFill = interp(frame, [80, 110], [0, p.prob / 100], easeOut);

          return (
            <div key={i} style={{
              opacity: op, transform: `translateX(${sl}px)`,
              padding: '0 32px',
              display: 'flex', flexDirection: 'column', gap: 18,
              alignItems: p.dir === 'left' ? 'flex-end' : 'flex-start',
              textAlign: p.dir === 'left' ? 'right' : 'left',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                flexDirection: p.dir === 'left' ? 'row-reverse' : 'row',
              }}>
                <svg width={48} height={48} viewBox="0 0 28 28">
                  <polygon
                    points={p.kind === 'bull' ? '14,2 26,22 2,22' : '14,26 26,6 2,6'}
                    fill={p.color} />
                </svg>
                <span style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 40,
                  letterSpacing: '0.18em', color: p.color,
                }}>{p.label}</span>
              </div>

              <div style={{
                fontFamily: BRAND.fonts.body, fontStyle: 'italic', fontSize: 26,
                color: BRAND.colors.inkMid, lineHeight: 1.5, maxWidth: 540,
                borderLeft: p.dir === 'right' ? `3px solid ${p.color}66` : 'none',
                borderRight: p.dir === 'left' ? `3px solid ${p.color}66` : 'none',
                paddingLeft: p.dir === 'right' ? 14 : 0,
                paddingRight: p.dir === 'left' ? 14 : 0,
              }}>{p.cond}</div>

              <div style={{
                opacity: tOp, transform: `scale(${tScale})`,
                transformOrigin: p.dir === 'left' ? 'right' : 'left',
              }}>
                <div style={{
                  fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.2em',
                  color: BRAND.colors.inkLight,
                }}>CIBLE</div>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 120,
                  color: p.color, lineHeight: 0.95,
                }}>{p.target}</div>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 36,
                  color: p.color, marginTop: -6,
                }}>{p.delta}</div>
              </div>

              {/* prob */}
              <div style={{ width: 320, marginTop: 6 }}>
                <div style={{
                  fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.2em',
                  color: BRAND.colors.inkLight, marginBottom: 6,
                }}>PROBABILITÉ</div>
                <div style={{
                  width: '100%', height: 8, background: BRAND.colors.creamDeep,
                }}>
                  <div style={{
                    width: `${probFill * 100}%`, height: '100%', background: p.color,
                  }} />
                </div>
                <div style={{
                  fontFamily: BRAND.fonts.condensed, fontSize: 28, color: p.color, marginTop: 4,
                }}>{Math.round(probFill * 100)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========== SCENARIO V2: Probability Tree ====================== */
function ScenarioTree({ frame }) {
  const trunkW = interp(frame, [10, 36], [0, 1], easeOut);
  const branchOp = interp(frame, [30, 50], [0, 1]);

  const Branch = ({ x1, y1, x2, y2, prog, color, w = 4 }) => (
    <line x1={x1} y1={y1}
      x2={x1 + (x2 - x1) * prog} y2={y1 + (y2 - y1) * prog}
      stroke={color} strokeWidth={w} strokeLinecap="round" />
  );

  const bullProg = interp(frame, [40, 70], [0, 1], easeOut);
  const bearProg = interp(frame, [44, 74], [0, 1], easeOut);

  return (
    <div style={{ width: 1700, height: 900, position: 'relative' }}>
      <div style={{
        textAlign: 'center', marginBottom: 30,
        opacity: interp(frame, [0, 14], [0, 1]),
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.32em',
          color: BRAND.colors.inkLight, marginBottom: 12,
        }}>L'ARBRE DES POSSIBLES  ·  S&amp;P 500  ·  VENDREDI</div>
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 800,
          fontSize: 50, color: BRAND.colors.ink, lineHeight: 1.1,
        }}>L'inflation US peut-elle encore repartir&nbsp;?</div>
      </div>

      <svg width="100%" height={620} viewBox="0 0 1700 620"
        style={{ overflow: 'visible' }}>
        {/* trunk */}
        <line x1={850} y1={20} x2={850} y2={20 + 240 * trunkW}
          stroke={BRAND.colors.ink} strokeWidth={5} strokeLinecap="round" />
        <circle cx={850} cy={20} r={interp(frame, [4, 18], [0, 12], easeOutBack)}
          fill={BRAND.colors.ink} />

        {/* fork node */}
        <circle cx={850} cy={260} r={interp(frame, [28, 40], [0, 18], easeOutBack)}
          fill={BRAND.colors.cream} stroke={BRAND.colors.ink} strokeWidth={4} />

        {/* branches */}
        <Branch x1={850} y1={260} x2={420} y2={500}
          prog={bullProg} color={BRAND.colors.accentBull} />
        <Branch x1={850} y1={260} x2={1280} y2={500}
          prog={bearProg} color={BRAND.colors.accentBear} />

        {/* sub-branches */}
        <Branch x1={420} y1={500} x2={250} y2={620}
          prog={interp(frame, [70, 92], [0, 1])} color={`${BRAND.colors.accentBull}aa`} w={2.5} />
        <Branch x1={420} y1={500} x2={550} y2={620}
          prog={interp(frame, [76, 96], [0, 1])} color={`${BRAND.colors.accentBull}aa`} w={2.5} />
        <Branch x1={1280} y1={500} x2={1140} y2={620}
          prog={interp(frame, [76, 100], [0, 1])} color={`${BRAND.colors.accentBear}aa`} w={2.5} />
        <Branch x1={1280} y1={500} x2={1450} y2={620}
          prog={interp(frame, [82, 104], [0, 1])} color={`${BRAND.colors.accentBear}aa`} w={2.5} />

        {/* labels on trunk */}
        <text x={870} y={140} fontFamily={BRAND.fonts.mono} fontSize={16}
          letterSpacing="0.18em" fill={BRAND.colors.inkLight}
          opacity={interp(frame, [16, 30], [0, 1])}>SI L'IPC SORT…</text>
      </svg>

      {/* bull node card */}
      <div style={{
        position: 'absolute', left: 240, top: 460,
        opacity: interp(frame, [70, 84], [0, 1]),
        transform: `scale(${interp(frame, [70, 84], [0.8, 1], easeOutBack)})`,
        padding: '14px 22px',
        background: BRAND.colors.cream,
        border: `2px solid ${BRAND.colors.accentBull}`,
        boxShadow: `5px 5px 0 ${BRAND.colors.accentBull}`,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.2em',
          color: BRAND.colors.accentBull,
        }}>BULL  ·  62%  ·  IPC &lt; 3,1%</div>
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
          fontSize: 28, color: BRAND.colors.ink,
        }}>5 850</div>
        <div style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 24, color: BRAND.colors.accentBull,
        }}>+6,9%</div>
      </div>

      {/* bear node card */}
      <div style={{
        position: 'absolute', left: 1140, top: 460,
        opacity: interp(frame, [76, 90], [0, 1]),
        transform: `scale(${interp(frame, [76, 90], [0.8, 1], easeOutBack)})`,
        padding: '14px 22px',
        background: BRAND.colors.cream,
        border: `2px solid ${BRAND.colors.accentBear}`,
        boxShadow: `5px 5px 0 ${BRAND.colors.accentBear}`,
      }}>
        <div style={{
          fontFamily: BRAND.fonts.mono, fontSize: 12, letterSpacing: '0.2em',
          color: BRAND.colors.accentBear,
        }}>BEAR  ·  38%  ·  IPC &gt; 3,4%</div>
        <div style={{
          fontFamily: BRAND.fonts.display, fontStyle: 'italic', fontWeight: 700,
          fontSize: 28, color: BRAND.colors.ink,
        }}>5 180</div>
        <div style={{
          fontFamily: BRAND.fonts.condensed, fontSize: 24, color: BRAND.colors.accentBear,
        }}>−5,4%</div>
      </div>

      {/* sub leaves text */}
      <div style={{
        position: 'absolute', top: 760, left: 0, right: 0,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20,
        opacity: interp(frame, [100, 120], [0, 1]),
        padding: '0 60px',
      }}>
        {[
          { k: 'GOLDILOCKS', sub: 'Tech leadership', c: BRAND.colors.accentBull },
          { k: 'BREADTH', sub: 'Rotation small caps', c: BRAND.colors.accentBull },
          { k: 'STAGFLATION', sub: 'Énergie en tête', c: BRAND.colors.accentBear },
          { k: 'PANIC', sub: 'VIX > 25', c: BRAND.colors.accentBear },
        ].map((leaf, i) => (
          <div key={i} style={{
            fontFamily: BRAND.fonts.mono, fontSize: 14, letterSpacing: '0.16em',
            color: leaf.c, textAlign: 'center', borderTop: `1px solid ${leaf.c}`,
            paddingTop: 10,
          }}>
            <div style={{ fontWeight: 700 }}>{leaf.k}</div>
            <div style={{ color: BRAND.colors.inkLight, fontStyle: 'italic',
              fontFamily: BRAND.fonts.body, marginTop: 4, letterSpacing: 0,
              fontSize: 14,
            }}>{leaf.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.HeadlineFrontPage = HeadlineFrontPage;
window.HeadlineTabloid = HeadlineTabloid;
window.ScenarioBattle = ScenarioBattle;
window.ScenarioTree = ScenarioTree;
