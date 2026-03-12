import type { SnapshotFlagged, CausalBrief } from "../types";

/**
 * Build deterministic causal brief from flagged data.
 * Code-only, no LLM. C2 Sonnet receives this and enriches it with context.
 */
export function buildCausalBrief(flagged: SnapshotFlagged): CausalBrief {
  const chains: CausalBrief['chains'] = [];
  const signals: CausalBrief['intermarketSignals'] = [];

  const getAsset = (symbol: string) => flagged.assets.find(a => a.symbol === symbol);
  const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

  // ── Rule 1: Dollar strength → commodities pressure ──
  const dxy = getAsset('DX-Y.NYB');
  const gold = getAsset('GC=F');
  const silver = getAsset('SI=F');
  const oil = getAsset('CL=F');

  if (dxy && dxy.changePct > 0.3) {
    const pressuredCommodities = [gold, silver, oil].filter(a => a && a.changePct < -0.3);
    if (pressuredCommodities.length > 0) {
      chains.push({
        name: 'Dollar fort → pression commodities',
        confidence: Math.min(Math.abs(dxy.changePct) * 0.3, 1),
        steps: [
          `DXY ${pct(dxy.changePct)}`,
          ...pressuredCommodities.map(a => `→ ${a!.name} ${pct(a!.changePct)}`),
        ],
        relatedAssets: ['DX-Y.NYB', ...pressuredCommodities.map(a => a!.symbol)],
      });
    }
  }

  // ── Rule 2: Dollar weakness → commodities boost ──
  if (dxy && dxy.changePct < -0.3) {
    const boostedCommodities = [gold, silver, oil].filter(a => a && a.changePct > 0.3);
    if (boostedCommodities.length > 0) {
      chains.push({
        name: 'Dollar faible → soutien commodities',
        confidence: Math.min(Math.abs(dxy.changePct) * 0.3, 1),
        steps: [
          `DXY ${pct(dxy.changePct)}`,
          ...boostedCommodities.map(a => `→ ${a!.name} ${pct(a!.changePct)}`),
        ],
        relatedAssets: ['DX-Y.NYB', ...boostedCommodities.map(a => a!.symbol)],
      });
    }
  }

  // ── Rule 3: Yield spread → sector rotation ──
  if (flagged.yields) {
    const spread = flagged.yields.spread10y2y;
    if (spread > 0.5) {
      signals.push({
        signal: 'yield_curve_steepening',
        implication: 'Courbe qui se pentifie — banques et cycliques favorisées, growth sous pression',
      });
    } else if (spread < -0.2) {
      signals.push({
        signal: 'yield_curve_inversion',
        implication: 'Courbe inversée — signal récessif, flight to quality (obligations, or, CHF, JPY)',
      });
    }
  }

  // ── Rule 4: VIX spike → risk-off ──
  const vix = getAsset('^VIX');
  const spx = getAsset('^GSPC');
  if (vix && vix.changePct > 10) {
    chains.push({
      name: 'VIX spike → risk-off',
      confidence: Math.min(vix.changePct / 30, 1),
      steps: [
        `VIX ${pct(vix.changePct)}`,
        ...(spx ? [`→ S&P 500 ${pct(spx.changePct)}`] : []),
      ],
      relatedAssets: ['^VIX', '^GSPC', 'GC=F', 'USDJPY=X'],
    });
  }

  // ── Rule 5: BTC/ETH correlation ──
  const btc = getAsset('BTC-USD');
  const eth = getAsset('ETH-USD');
  if (btc && eth) {
    const sameDirection = (btc.changePct > 0 && eth.changePct > 0) || (btc.changePct < 0 && eth.changePct < 0);
    if (sameDirection && Math.abs(btc.changePct) > 2) {
      chains.push({
        name: btc.changePct > 0 ? 'Rally crypto corrélé' : 'Sell-off crypto corrélé',
        confidence: 0.8,
        steps: [
          `BTC ${pct(btc.changePct)}`,
          `→ ETH ${pct(eth.changePct)}`,
        ],
        relatedAssets: ['BTC-USD', 'ETH-USD', 'SOL-USD'],
      });
    }
  }

  // ── Rule 6: Oil → inflation expectations (signal) ──
  if (oil && Math.abs(oil.changePct) > 3) {
    signals.push({
      signal: oil.changePct > 0 ? 'oil_surge' : 'oil_crash',
      implication: oil.changePct > 0
        ? 'Pétrole en hausse — pression inflationniste, transport/airlines sous pression, producteurs favorisés'
        : 'Pétrole en baisse — détente inflationniste, consommation favorisée',
    });
  }

  // ── Rule 6b: Oil crash → gold up (flight to quality / inflation recalibration) ──
  if (oil && gold && oil.changePct < -3 && gold.changePct > 0.5) {
    chains.push({
      name: 'Oil crash + or en hausse — flight to quality',
      confidence: Math.min((Math.abs(oil.changePct) + gold.changePct) / 15, 1),
      steps: [
        `Pétrole ${pct(oil.changePct)}`,
        `→ Incertitude géopolitique / recalibration inflation`,
        `→ Or ${pct(gold.changePct)} (valeur refuge)`,
      ],
      relatedAssets: ['CL=F', 'GC=F', 'SI=F'],
    });
  }

  // ── Rule 6c: Oil crash → indices européens up (coût énergie baisse) ──
  const euroIndices = ['^FCHI', '^GDAXI', '^STOXX'].map(getAsset).filter(Boolean);
  if (oil && oil.changePct < -3 && euroIndices.length >= 2) {
    const risingEuro = euroIndices.filter(a => a!.changePct > 0.5);
    if (risingEuro.length >= 2) {
      chains.push({
        name: 'Oil crash → rebond Europe (coût énergie)',
        confidence: Math.min(Math.abs(oil.changePct) / 15, 1),
        steps: [
          `Pétrole ${pct(oil.changePct)}`,
          `→ Détente coûts énergie pour industrie européenne`,
          ...risingEuro.map(a => `→ ${a!.name} ${pct(a!.changePct)}`),
        ],
        relatedAssets: ['CL=F', ...risingEuro.map(a => a!.symbol)],
      });
    }
  }

  // ── Rule 6d: Oil surge → airlines/transport down, producers up ──
  const xle = getAsset('XLE');
  if (oil && oil.changePct > 5 && xle) {
    chains.push({
      name: 'Oil surge → rotation énergie',
      confidence: Math.min(oil.changePct / 15, 1),
      steps: [
        `Pétrole ${pct(oil.changePct)}`,
        `→ XLE (Energy) ${pct(xle.changePct)}`,
      ],
      relatedAssets: ['CL=F', 'XLE'],
    });
  }

  // ── Rule 7: JPY as risk gauge ──
  const usdjpy = getAsset('USDJPY=X');
  if (usdjpy && Math.abs(usdjpy.changePct) > 0.8) {
    signals.push({
      signal: usdjpy.changePct < 0 ? 'yen_strength_risk_off' : 'yen_weakness_risk_on',
      implication: usdjpy.changePct < 0
        ? 'Yen fort (USD/JPY baisse) — flight to safety, carry trade unwind possible'
        : 'Yen faible (USD/JPY hausse) — appétit pour le risque, carry trade favorable',
    });
  }

  // ── Rule 8: Gold/Silver ratio divergence ──
  if (gold && silver && Math.abs(gold.changePct - silver.changePct) > 2) {
    signals.push({
      signal: gold.changePct > silver.changePct ? 'gold_silver_divergence_defensive' : 'gold_silver_divergence_industrial',
      implication: gold.changePct > silver.changePct
        ? 'Or surperforme argent — mode défensif, investisseurs privilégient la valeur refuge'
        : 'Argent surperforme or — appétit industriel, signal de reprise économique',
    });
  }

  // ── Rule 9: Global indices correlation ──
  const indices = ['^GSPC', '^IXIC', '^DJI', '^FCHI', '^GDAXI', '^N225'].map(getAsset).filter(Boolean);
  if (indices.length >= 4) {
    const allDown = indices.every(a => a!.changePct < -0.5);
    const allUp = indices.every(a => a!.changePct > 0.5);
    if (allDown) {
      signals.push({
        signal: 'global_risk_off',
        implication: 'Sell-off global synchronisé — facteur macro systémique probable',
      });
    } else if (allUp) {
      signals.push({
        signal: 'global_risk_on',
        implication: 'Rally global synchronisé — appétit pour le risque généralisé',
      });
    }
  }

  // ── Rule 9b: US/Europe divergence ──
  const usIndices = ['^GSPC', '^IXIC', '^DJI'].map(getAsset).filter(Boolean);
  const euIndices = ['^FCHI', '^GDAXI', '^STOXX'].map(getAsset).filter(Boolean);
  if (usIndices.length >= 2 && euIndices.length >= 2) {
    const usAvg = usIndices.reduce((s, a) => s + a!.changePct, 0) / usIndices.length;
    const euAvg = euIndices.reduce((s, a) => s + a!.changePct, 0) / euIndices.length;
    if (Math.abs(usAvg - euAvg) > 1.5) {
      signals.push({
        signal: usAvg > euAvg ? 'us_outperforms_europe' : 'europe_outperforms_us',
        implication: usAvg > euAvg
          ? `US surperforme Europe (${pct(usAvg)} vs ${pct(euAvg)}) — rotation géographique ou facteur domestique US`
          : `Europe surperforme US (${pct(euAvg)} vs ${pct(usAvg)}) — possible rotation, facteur européen ou désescalade géopolitique`,
      });
    }
  }

  // ── Rule 10: Sentiment extreme ──
  if (flagged.sentiment) {
    const fg = flagged.sentiment.cryptoFearGreed.value;
    if (fg < 20) {
      signals.push({
        signal: 'extreme_fear',
        implication: `Fear & Greed à ${fg} (Extreme Fear) — historiquement signal contrarian haussier à moyen terme`,
      });
    } else if (fg > 80) {
      signals.push({
        signal: 'extreme_greed',
        implication: `Fear & Greed à ${fg} (Extreme Greed) — complaisance, risque de correction à court terme`,
      });
    }
  }

  // ── Rule 11: Gold as geopolitical thermometer ──
  if (gold && Math.abs(gold.changePct) > 1.5) {
    const direction = gold.changePct > 0 ? 'hausse' : 'baisse';
    signals.push({
      signal: gold.changePct > 0 ? 'gold_bid_geopolitical' : 'gold_sell_risk_on',
      implication: gold.changePct > 0
        ? `Or en forte ${direction} (${pct(gold.changePct)}) — demande refuge, incertitude géopolitique ou monétaire`
        : `Or en ${direction} (${pct(gold.changePct)}) — retour appétit risque, moins de demande refuge`,
    });
  }

  return { chains, intermarketSignals: signals };
}
