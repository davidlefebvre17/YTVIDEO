// Test extractJSON robustness

function extractJSON(text: string): string {
  const fenceMatch = text.match(/`{3,}(?:json)?\s*([\s\S]*?)`{3,}/);
  if (fenceMatch?.[1]?.trim()) return fenceMatch[1].trim();

  const openFence = text.match(/^`{3,}(?:json)?\s*\n?([\s\S]*)$/);
  if (openFence?.[1]?.trim()) {
    const stripped = openFence[1].trim();
    return stripped.replace(/`{1,3}\s*$/, "").trim();
  }

  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;
  if (start >= 0) {
    const opener = text[start];
    const closer = opener === "{" ? "}" : "]";
    const lastClose = text.lastIndexOf(closer);
    if (lastClose > start) return text.slice(start, lastClose + 1);
  }

  return text.trim();
}

const tests = [
  { name: "clean JSON", input: '{"a": 1}', expect: '{"a": 1}' },
  { name: "```json fenced", input: '```json\n{"a": 1}\n```', expect: '{"a": 1}' },
  { name: "````json fenced", input: '````json\n{"a": 1}\n````', expect: '{"a": 1}' },
  { name: "truncated fence", input: '```json\n{"a": 1, "b": 2}', expect: '{"a": 1, "b": 2}' },
  { name: "text before JSON", input: 'Here is the result:\n{"a": 1}', expect: '{"a": 1}' },
  { name: "fence + trailing text", input: '```json\n{"a": 1}\n```\nSome extra text', expect: '{"a": 1}' },
  { name: "array response", input: '```json\n[1, 2, 3]\n```', expect: '[1, 2, 3]' },
];

let pass = 0;
for (const t of tests) {
  const result = extractJSON(t.input);
  const ok = result === t.expect;
  console.log(`${ok ? "PASS" : "FAIL"} ${t.name}`);
  if (!ok) console.log(`  got:    ${result}\n  expect: ${t.expect}`);
  if (ok) pass++;
}
console.log(`\n${pass}/${tests.length} passed`);
