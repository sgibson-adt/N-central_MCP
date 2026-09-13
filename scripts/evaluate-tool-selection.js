#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveToolConfiguration } from '../src/toolsets.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const normalize = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
const terms = (tool) => ({
  name: normalize(tool.name),
  description: normalize(tool.description),
  parameters: normalize(Object.entries(tool.inputSchema.properties || {}).flatMap(([name, value]) => [name, value.description || '']).join(' ')),
});
const score = (prompt, tool) => {
  const wanted = new Set(normalize(prompt)); const index = terms(tool);
  return index.name.filter((term) => wanted.has(term)).length * 5
    + index.parameters.filter((term) => wanted.has(term)).length * 2
    + index.description.filter((term) => wanted.has(term)).length;
};

export function rankTools(prompt, tools) {
  return tools.map((tool) => ({ tool: tool.name, score: score(prompt, tool) }))
    .filter(({ score: value }) => value > 0)
    .sort((a, b) => b.score - a.score || a.tool.localeCompare(b.tool));
}

export function evaluateSelectionCases(cases) {
  let eligible = 0; let topOne = 0; let topThree = 0; let prohibitedAccepted = 0; let hiddenCandidates = 0;
  for (const fixture of cases) {
    const selected = resolveToolConfiguration({ rawToolsets: fixture.enabledToolsets.join(','), rawWriteMode: fixture.writeMode }).tools;
    const visible = new Set(selected.map((tool) => tool.name));
    const ranked = rankTools(fixture.prompt, selected);
    if (['ordinary', 'ambiguous'].includes(fixture.caseType)) {
      eligible += 1;
      if (fixture.expectedTools.includes(ranked[0]?.tool)) topOne += 1;
      if (ranked.slice(0, 3).some(({ tool }) => fixture.expectedTools.includes(tool))) topThree += 1;
    }
    if (ranked.slice(0, 3).some(({ tool }) => fixture.prohibitedTools.includes(tool))) prohibitedAccepted += 1;
    if (ranked.some(({ tool }) => !visible.has(tool))) hiddenCandidates += 1;
  }
  return { cases: cases.length, eligible, topOneRate: eligible ? topOne / eligible : 0, topThreeRate: eligible ? topThree / eligible : 0, prohibitedAccepted, hiddenCandidates };
}

function render(metrics) {
  return `# MCP Tool Selection Evaluation\n\n## Offline deterministic results\n\n- Cases: ${metrics.cases}\n- Ordinary/ambiguous cases: ${metrics.eligible}\n- Top-one success: ${(metrics.topOneRate * 100).toFixed(1)}%\n- Top-three success: ${(metrics.topThreeRate * 100).toFixed(1)}%\n- Prohibited accepted choices: ${metrics.prohibitedAccepted}\n- Hidden candidates: ${metrics.hiddenCandidates}\n- Evaluator: local weighted lexical ranking (no model API or network)\n\n## Performance budget observation\n\nMeasured 2026-09-13 on macOS 26.6.2 arm64 with Node 24.13.0 and npm 11.8.0.\n\n| Gate | Budget | Observed wall time | Result |\n|---|---:|---:|---|\n| \`npm run coverage:api:check\` | <5 seconds | 0.24 seconds | pass |\n| \`npm test\` | <60 seconds | 3.33 seconds | pass |\n\n## Optional client smoke matrix\n\n| Client | Status |\n|---|---|\n| Codex | not run |\n| GitHub Copilot | not run |\n| Claude | not run |\n`;
}

async function main() {
  const cases = JSON.parse(readFileSync(`${root}test/evaluation/tool-selection-cases.json`, 'utf8'));
  const metrics = evaluateSelectionCases(cases);
  if (metrics.topThreeRate < 0.95 || metrics.prohibitedAccepted || metrics.hiddenCandidates) process.exitCode = 1;
  const output = render(metrics); const target = `${root}docs/MCP-EVALUATION.md`;
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== output) { console.error('docs/MCP-EVALUATION.md is stale'); process.exitCode = 1; }
  } else writeFileSync(target, output);
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await main();
