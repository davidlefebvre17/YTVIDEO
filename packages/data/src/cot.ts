import type { COTPositioning, COTContractData } from "@yt-maker/core";
import { createGunzip } from "zlib";
import { Readable } from "stream";

// ── CFTC Bulk CSV Downloads (free, no auth, reliable) ────────────────────────
// Primary: bulk ZIP from www.cftc.gov (same domain as main site — reliable)
// Fallback: Socrata JSON API (publicreporting.cftc.gov — can timeout)

const CURRENT_YEAR = new Date().getFullYear();

// Bulk CSV URLs — contain ALL contracts for the year in one file
const TFF_CSV_URL = `https://www.cftc.gov/files/dea/history/fut_fin_txt_${CURRENT_YEAR}.zip`;
const DISAGG_CSV_URL = `https://www.cftc.gov/files/dea/history/fut_disagg_txt_${CURRENT_YEAR}.zip`;

// Socrata fallback
const TFF_SOCRATA = "https://publicreporting.cftc.gov/resource/gpe5-46if.json";
const DISAGG_SOCRATA = "https://publicreporting.cftc.gov/resource/72hh-3qpy.json";

// ── Contract mapping ─────────────────────────────────────────────────────────

interface ContractDef {
  symbol: string;
  name: string;
  cftcCode: string;
  type: "tff" | "disagg";
  invert?: boolean;
}

const COT_CONTRACTS: ContractDef[] = [
  // Financial futures (TFF)
  { symbol: "EURUSD=X",  name: "Euro FX",           cftcCode: "099741", type: "tff" },
  { symbol: "JPY=X",     name: "Japanese Yen",       cftcCode: "097741", type: "tff", invert: true },
  { symbol: "GBPUSD=X",  name: "British Pound",      cftcCode: "096742", type: "tff" },
  { symbol: "AUDUSD=X",  name: "Australian Dollar",  cftcCode: "232741", type: "tff" },
  { symbol: "CADUSD=X",  name: "Canadian Dollar",    cftcCode: "090741", type: "tff", invert: true },
  { symbol: "CHFUSD=X",  name: "Swiss Franc",        cftcCode: "092741", type: "tff" },
  { symbol: "NZDUSD=X",  name: "New Zealand Dollar", cftcCode: "112741", type: "tff" },
  { symbol: "DX-Y.NYB",  name: "US Dollar Index",    cftcCode: "098662", type: "tff" },
  { symbol: "^GSPC",     name: "E-Mini S&P 500",     cftcCode: "13874A", type: "tff" },
  { symbol: "^IXIC",     name: "E-Mini Nasdaq",      cftcCode: "209742", type: "tff" },
  { symbol: "BTC-USD",   name: "Bitcoin CME",        cftcCode: "133741", type: "tff" },

  // Physical commodities (Disaggregated)
  { symbol: "GC=F",  name: "Gold",           cftcCode: "088691", type: "disagg" },
  { symbol: "SI=F",  name: "Silver",         cftcCode: "084691", type: "disagg" },
  { symbol: "CL=F",  name: "Crude Oil WTI",  cftcCode: "067651", type: "disagg" },
  { symbol: "NG=F",  name: "Natural Gas",    cftcCode: "023651", type: "disagg" },
  { symbol: "HG=F",  name: "Copper",         cftcCode: "085692", type: "disagg" },
];

// ── ZIP/CSV helpers ──────────────────────────────────────────────────────────

/** Download a ZIP, extract the first file, return its text content. */
async function downloadAndUnzip(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CFTC download ${res.status}: ${url}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  // CFTC ZIPs use PKZIP format. Parse the local file header to find the CSV.
  // Simple ZIP parser — CFTC zips contain a single CSV file.
  const entries = parseZipEntries(buffer);
  if (entries.length === 0) throw new Error("Empty ZIP");

  const entry = entries[0];
  if (entry.compressionMethod === 8) {
    // Deflate — use zlib
    return new Promise<string>((resolve, reject) => {
      const gunzip = createGunzip();
      const chunks: Buffer[] = [];
      // createGunzip expects raw deflate with zlib header; CFTC uses raw deflate
      // Use createInflateRaw instead
      const { createInflateRaw } = require("zlib") as typeof import("zlib");
      const inflate = createInflateRaw();
      inflate.on("data", (chunk: Buffer) => chunks.push(chunk));
      inflate.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      inflate.on("error", reject);
      Readable.from(entry.compressedData).pipe(inflate);
    });
  } else if (entry.compressionMethod === 0) {
    // Stored (no compression)
    return entry.compressedData.toString("utf-8");
  } else {
    throw new Error(`Unsupported compression method: ${entry.compressionMethod}`);
  }
}

interface ZipEntry {
  filename: string;
  compressionMethod: number;
  compressedData: Buffer;
}

function parseZipEntries(buffer: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // Local file header signature

    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const filename = buffer.subarray(offset + 30, offset + 30 + filenameLength).toString("utf-8");
    const dataStart = offset + 30 + filenameLength + extraLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);

    entries.push({ filename, compressionMethod, compressedData });
    offset = dataStart + compressedSize;
  }

  return entries;
}

/** Parse CSV text into rows of key-value pairs. */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Headers — CFTC uses comma-separated with quotes around some fields
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = values[j].trim();
    }
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Row normalization (CSV headers differ from Socrata JSON keys) ────────────

/** Normalize CSV column names to lowercase_underscored (matching Socrata keys). */
function normalizeRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    const normKey = key.trim()
      .replace(/[""]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[()]/g, "")
      .toLowerCase();
    normalized[normKey] = val.replace(/[""]/g, "").trim();
  }
  return normalized;
}

// ── Parse functions ──────────────────────────────────────────────────────────

function parseTFF(row: Record<string, string>, invert: boolean): COTContractData | null {
  // CSV: "As_of_Date_In_Form_YYMMDD" or Socrata: "report_date_as_yyyy_mm_dd"
  const dateRaw = row.report_date_as_yyyy_mm_dd
    || row.as_of_date_in_form_yymmdd
    || row.report_date_as_mm_dd_yyyy;
  if (!dateRaw) return null;

  const date = normalizeDate(dateRaw);

  const assetMgrLong = num(row.asset_mgr_positions_long_all || row.asset_mgr_positions_long_all_noco);
  const assetMgrShort = num(row.asset_mgr_positions_short_all || row.asset_mgr_positions_short_all_noco);
  const levLong = num(row.lev_money_positions_long_all || row.lev_money_positions_long_all_noco);
  const levShort = num(row.lev_money_positions_short_all || row.lev_money_positions_short_all_noco);
  const dealerLong = num(row.dealer_positions_long_all || row.dealer_positions_long_all_noco);
  const dealerShort = num(row.dealer_positions_short_all || row.dealer_positions_short_all_noco);
  const oi = num(row.open_interest_all || row.open_interest_all_noco);

  const sign = invert ? -1 : 1;

  return {
    reportDate: date,
    openInterest: oi,
    assetManagers: {
      netPosition: (assetMgrLong - assetMgrShort) * sign,
      long: assetMgrLong,
      short: assetMgrShort,
      pctOfOI: oi > 0 ? +((assetMgrLong - assetMgrShort) / oi * 100).toFixed(1) : 0,
    },
    leveragedFunds: {
      netPosition: (levLong - levShort) * sign,
      long: levLong,
      short: levShort,
      pctOfOI: oi > 0 ? +((levLong - levShort) / oi * 100).toFixed(1) : 0,
    },
    dealers: {
      netPosition: (dealerLong - dealerShort) * sign,
      long: dealerLong,
      short: dealerShort,
      pctOfOI: oi > 0 ? +((dealerLong - dealerShort) / oi * 100).toFixed(1) : 0,
    },
  };
}

function parseDisagg(row: Record<string, string>): COTContractData | null {
  const dateRaw = row.report_date_as_yyyy_mm_dd
    || row.as_of_date_in_form_yymmdd
    || row.report_date_as_mm_dd_yyyy;
  if (!dateRaw) return null;

  const date = normalizeDate(dateRaw);

  const mmLong = num(row.m_money_positions_long_all || row.money_manager_positions_long_all);
  const mmShort = num(row.m_money_positions_short_all || row.money_manager_positions_short_all);
  const prodLong = num(row.prod_merc_positions_long_all || row.producer_merchant_positions_long_all);
  const prodShort = num(row.prod_merc_positions_short_all || row.producer_merchant_positions_short_all);
  const swapLong = num(row.swap_positions_long_all || row.swap__positions_long_all || row.swap_dealer_positions_long_all);
  const swapShort = num(row.swap_positions_short_all || row.swap__positions_short_all || row.swap_dealer_positions_short_all);
  const oi = num(row.open_interest_all);

  return {
    reportDate: date,
    openInterest: oi,
    assetManagers: {
      netPosition: mmLong - mmShort,
      long: mmLong,
      short: mmShort,
      pctOfOI: oi > 0 ? +((mmLong - mmShort) / oi * 100).toFixed(1) : 0,
    },
    dealers: {
      netPosition: prodLong - prodShort,
      long: prodLong,
      short: prodShort,
      pctOfOI: oi > 0 ? +((prodLong - prodShort) / oi * 100).toFixed(1) : 0,
    },
    leveragedFunds: {
      netPosition: swapLong - swapShort,
      long: swapLong,
      short: swapShort,
      pctOfOI: oi > 0 ? +((swapLong - swapShort) / oi * 100).toFixed(1) : 0,
    },
  };
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseInt(v.replace(/,/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

/** Normalize various date formats to YYYY-MM-DD */
function normalizeDate(raw: string): string {
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // MM/DD/YYYY
  const mdyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, "0")}-${mdyMatch[2].padStart(2, "0")}`;
  // YYMMDD
  if (/^\d{6}$/.test(raw)) {
    const yy = parseInt(raw.slice(0, 2), 10);
    const year = yy > 50 ? 1900 + yy : 2000 + yy;
    return `${year}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  }
  return raw;
}

// ── Signals ──────────────────────────────────────────────────────────────────

function computeSignals(data: COTContractData[]): COTContractData["signals"] {
  if (data.length < 2) return undefined;

  const current = data[0];
  const previous = data[1];
  const netChangeSpeculators = current.assetManagers.netPosition - previous.assetManagers.netPosition;

  const nets = data.map((d) => d.assetManagers.netPosition);
  const maxNet = Math.max(...nets);
  const minNet = Math.min(...nets);
  const range = maxNet - minNet;
  const percentile = range > 0 ? +((current.assetManagers.netPosition - minNet) / range * 100).toFixed(0) : 50;

  let bias: "extreme_long" | "extreme_short" | "long" | "short" | "neutral" = "neutral";
  if (+percentile >= 90) bias = "extreme_long";
  else if (+percentile <= 10) bias = "extreme_short";
  else if (+percentile >= 65) bias = "long";
  else if (+percentile <= 35) bias = "short";

  const flip = (current.assetManagers.netPosition > 0) !== (previous.assetManagers.netPosition > 0);

  return {
    netChangeSpeculators,
    percentileRank: +percentile,
    bias,
    flipDetected: flip,
    weeksInDirection: countWeeksInDirection(data),
  };
}

function countWeeksInDirection(data: COTContractData[]): number {
  if (data.length < 2) return 1;
  const currentSign = data[0].assetManagers.netPosition >= 0;
  let count = 1;
  for (let i = 1; i < data.length; i++) {
    if ((data[i].assetManagers.netPosition >= 0) === currentSign) count++;
    else break;
  }
  return count;
}

// ── Primary: Bulk CSV fetch ──────────────────────────────────────────────────

async function fetchFromBulkCSV(): Promise<COTPositioning["contracts"]> {
  const results: COTPositioning["contracts"] = [];

  const tffContracts = COT_CONTRACTS.filter((c) => c.type === "tff");
  const disaggContracts = COT_CONTRACTS.filter((c) => c.type === "disagg");

  // Download both ZIPs in parallel
  const [tffCSV, disaggCSV] = await Promise.all([
    downloadAndUnzip(TFF_CSV_URL),
    downloadAndUnzip(DISAGG_CSV_URL),
  ]);

  // Parse CSVs
  const tffRows = parseCSV(tffCSV).map(normalizeRow);
  const disaggRows = parseCSV(disaggCSV).map(normalizeRow);

  // Process TFF contracts
  for (const contract of tffContracts) {
    const contractRows = tffRows
      .filter((r) => {
        const code = r.cftc_contract_market_code || r["cftc_contract_market_code"];
        return code === contract.cftcCode;
      })
      .map((r) => parseTFF(r, contract.invert ?? false))
      .filter(Boolean) as COTContractData[];

    // Sort by date descending
    contractRows.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
    const recent = contractRows.slice(0, 10);

    if (recent.length === 0) continue;

    const signals = computeSignals(recent);
    if (signals) recent[0].signals = signals;

    results.push({
      symbol: contract.symbol,
      name: contract.name,
      reportType: "tff",
      current: recent[0],
      history: recent.slice(1),
    });
  }

  // Process Disaggregated contracts
  for (const contract of disaggContracts) {
    const contractRows = disaggRows
      .filter((r) => {
        const code = r.cftc_contract_market_code || r["cftc_contract_market_code"];
        return code === contract.cftcCode;
      })
      .map((r) => parseDisagg(r))
      .filter(Boolean) as COTContractData[];

    contractRows.sort((a, b) => b.reportDate.localeCompare(a.reportDate));
    const recent = contractRows.slice(0, 10);

    if (recent.length === 0) continue;

    const signals = computeSignals(recent);
    if (signals) recent[0].signals = signals;

    results.push({
      symbol: contract.symbol,
      name: contract.name,
      reportType: "disaggregated",
      current: recent[0],
      history: recent.slice(1),
    });
  }

  return results;
}

// ── Fallback: Socrata JSON API ───────────────────────────────────────────────

async function fetchFromSocrata(): Promise<COTPositioning["contracts"]> {
  const results: COTPositioning["contracts"] = [];

  const fetchOne = async (endpoint: string, contract: ContractDef, parser: "tff" | "disagg") => {
    const query = `$where=cftc_contract_market_code='${contract.cftcCode}'&$order=report_date_as_yyyy_mm_dd DESC&$limit=10`;
    const res = await fetch(`${endpoint}?${query}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`${res.status}`);
    const rows = await res.json() as Record<string, string>[];
    const parsed = rows
      .map((r) => parser === "tff" ? parseTFF(r, contract.invert ?? false) : parseDisagg(r))
      .filter(Boolean) as COTContractData[];

    if (parsed.length === 0) return;
    const signals = computeSignals(parsed);
    if (signals) parsed[0].signals = signals;

    results.push({
      symbol: contract.symbol,
      name: contract.name,
      reportType: parser === "tff" ? "tff" : "disaggregated",
      current: parsed[0],
      history: parsed.slice(1),
    });
  };

  const fetches = [
    ...COT_CONTRACTS.filter((c) => c.type === "tff").map((c) =>
      fetchOne(TFF_SOCRATA, c, "tff").catch((e) => console.warn(`  COT Socrata: ${c.name}: ${e}`)),
    ),
    ...COT_CONTRACTS.filter((c) => c.type === "disagg").map((c) =>
      fetchOne(DISAGG_SOCRATA, c, "disagg").catch((e) => console.warn(`  COT Socrata: ${c.name}: ${e}`)),
    ),
  ];

  await Promise.all(fetches);
  return results;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetch COT positioning data for all watchlist contracts.
 * Primary: CFTC bulk CSV (2 ZIP downloads, reliable).
 * Fallback: Socrata JSON API (can timeout on some networks).
 *
 * Publication: every Friday 3:30 PM ET (data as of previous Tuesday).
 */
export async function fetchCOTPositioning(): Promise<COTPositioning | undefined> {
  console.log("  Fetching COT positioning from CFTC...");

  let results: COTPositioning["contracts"] = [];

  // Try bulk CSV first (more reliable)
  try {
    results = await fetchFromBulkCSV();
    if (results.length > 0) {
      console.log(`  COT (bulk CSV): ${results.length}/${COT_CONTRACTS.length} contracts`);
    }
  } catch (err) {
    console.warn(`  COT bulk CSV failed: ${err}. Trying Socrata fallback...`);
  }

  // Fallback to Socrata if bulk CSV failed
  if (results.length === 0) {
    try {
      results = await fetchFromSocrata();
      if (results.length > 0) {
        console.log(`  COT (Socrata): ${results.length}/${COT_CONTRACTS.length} contracts`);
      }
    } catch (err) {
      console.warn(`  COT Socrata also failed: ${err}`);
      return undefined;
    }
  }

  if (results.length === 0) {
    console.warn("  COT: no data retrieved from any source");
    return undefined;
  }

  // Sort by symbol for stable output
  results.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const reportDate = results[0]?.current.reportDate || "unknown";
  console.log(`  COT: report date ${reportDate}`);

  // Log notable signals
  for (const r of results) {
    const s = r.current.signals;
    if (s && (s.bias.includes("extreme") || s.flipDetected)) {
      const label = s.flipDetected ? "FLIP" : s.bias === "extreme_long" ? "EXTREME LONG" : "EXTREME SHORT";
      console.log(`    ${label} ${r.name}: net=${r.current.assetManagers.netPosition} (P${s.percentileRank})`);
    }
  }

  return { reportDate, contracts: results };
}
