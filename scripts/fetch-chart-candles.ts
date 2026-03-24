import * as fs from "fs";
import { fetchDaily3yCandles } from "../packages/data/src/yahoo";

const CHART_SYMBOLS = ['^GSPC', 'CL=F', 'BZ=F', 'GC=F', 'BTC-USD'];

async function main() {
  const propsPath = "data/beat-test-props.json";
  const props = JSON.parse(fs.readFileSync(propsPath, "utf-8"));

  for (const sym of CHART_SYMBOLS) {
    const candles = await fetchDaily3yCandles(sym);
    console.log(`${sym}: ${candles.length} candles fetched`);
    const asset = props.assets.find((a: any) => a.symbol === sym);
    if (asset) asset.dailyCandles = candles;
  }

  fs.writeFileSync(propsPath, JSON.stringify(props));

  const chartSymbols = new Set(CHART_SYMBOLS);
  const lightAssets = props.assets.map((a: any) => ({
    symbol: a.symbol, name: a.name, price: a.price,
    change: a.change, changePct: a.changePct,
    candles: chartSymbols.has(a.symbol) ? (a.dailyCandles || []) : [],
    dailyCandles: chartSymbols.has(a.symbol) ? (a.dailyCandles || []) : [],
    high24h: a.high24h, low24h: a.low24h,
  }));
  const light = { script: props.script, beats: props.beats, assets: lightAssets, news: props.news.slice(0, 5) };
  fs.writeFileSync("packages/remotion-app/src/fixtures/real-beats.json", JSON.stringify(light));
  console.log("Light JSON: " + (fs.statSync("packages/remotion-app/src/fixtures/real-beats.json").size / 1024).toFixed(0) + "KB");
}

main();
