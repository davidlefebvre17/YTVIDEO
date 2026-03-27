/**
 * ScrollingTicker — bandeau permanent en haut de la vidéo.
 *
 * Défile de droite à gauche en boucle continue pendant toute la vidéo.
 * Affiche tous les assets avec prix + variation % jour.
 * Fond noir semi-transparent, style Bloomberg/BFM.
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "@yt-maker/core";
import type { AssetSnapshot } from "@yt-maker/core";

interface ScrollingTickerProps {
  assets: AssetSnapshot[];
  /** Vitesse en pixels/frame (default 2.5) */
  speed?: number;
  /** Hauteur du bandeau (default 32) */
  height?: number;
}

/** Noms courts pour les symboles courants */
const SHORT_NAMES: Record<string, string> = {
  "^GSPC": "S&P 500",
  "^DJI": "Dow Jones",
  "^IXIC": "Nasdaq",
  "^FCHI": "CAC 40",
  "^GDAXI": "DAX",
  "^FTSE": "FTSE 100",
  "^N225": "Nikkei",
  "^STOXX": "Stoxx 600",
  "^VIX": "VIX",
  "GC=F": "Or",
  "SI=F": "Argent",
  "CL=F": "Pétrole WTI",
  "BZ=F": "Brent",
  "NG=F": "Gaz Nat.",
  "BTC-USD": "Bitcoin",
  "ETH-USD": "Ethereum",
  "EURUSD=X": "EUR/USD",
  "USDJPY=X": "USD/JPY",
  "GBPUSD=X": "GBP/USD",
  "DX-Y.NYB": "Dollar Idx",
};

function getDisplayName(asset: AssetSnapshot): string {
  return SHORT_NAMES[asset.symbol] ?? asset.name?.split(" ")[0] ?? asset.symbol;
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

export const ScrollingTicker: React.FC<ScrollingTickerProps> = ({
  assets,
  speed = 3,
  height = 48,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  if (!assets || assets.length === 0) return null;

  // Largeur estimée par item (symbole + prix + variation + espacement)
  const ITEM_WIDTH = 320;
  // Dupliquer les assets pour un scroll continu sans gap
  const totalWidth = assets.length * ITEM_WIDTH;
  // Offset basé sur le frame — boucle quand on dépasse une longueur complète
  const offset = (frame * speed) % totalWidth;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height,
        backgroundColor: "rgba(11, 15, 26, 0.85)",
        overflow: "hidden",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Deux copies côte à côte pour le scroll infini */}
      {[0, 1].map((copy) => (
        <div
          key={copy}
          style={{
            display: "flex",
            alignItems: "center",
            position: "absolute",
            left: 0,
            top: 0,
            height,
            transform: `translateX(${-offset + copy * totalWidth}px)`,
            whiteSpace: "nowrap",
          }}
        >
          {assets.map((asset, i) => {
            const pct = asset.changePct ?? 0;
            const isUp = pct >= 0;
            const color = isUp ? BRAND.colors.profit : BRAND.colors.loss;
            const sign = isUp ? "+" : "";

            return (
              <div
                key={`${copy}-${asset.symbol}-${i}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 12,
                  width: ITEM_WIDTH,
                  paddingLeft: 20,
                  height,
                }}
              >
                {/* Symbole */}
                <span
                  style={{
                    fontFamily: BRAND.fonts.mono,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#ffffff",
                    letterSpacing: "0.05em",
                  }}
                >
                  {getDisplayName(asset)}
                </span>
                {/* Prix */}
                <span
                  style={{
                    fontFamily: BRAND.fonts.mono,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {formatPrice(asset.price)}
                </span>
                {/* Variation */}
                <span
                  style={{
                    fontFamily: BRAND.fonts.mono,
                    fontSize: 16,
                    fontWeight: 600,
                    color,
                  }}
                >
                  {sign}{pct.toFixed(2)}%
                </span>
                {/* Séparateur */}
                <span
                  style={{
                    color: "rgba(255,255,255,0.25)",
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  │
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
