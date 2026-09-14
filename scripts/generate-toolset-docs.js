#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveToolConfiguration, TOOLSET_NAMES } from '../src/toolsets.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = `${root}docs/MCP-TOOLSETS.md`;
const lines = [
  '# MCP Toolsets', '',
  'Toolsets control relevance and discovery; write mode independently controls authority. Names are case-insensitive, comma-separated, de-duplicated, and advertised in deterministic order.', '',
  '```dotenv',
  'NC_TOOLSETS=core,reporting',
  'NC_WRITE_MODE=read-only',
  '```', '',
  'Omitting both variables selects `core` and `read-only`. `NC_TOOLSETS=all` expands to the five preferred v3 catalogs (`core`, `operations`, `administration`, `psa`, and `reporting`) and intentionally excludes `compatibility`; use `all,compatibility` only for legacy-name migration. Valid write modes are `read-only`, `write`, and `full`; destructive tools appear only in `full`.', '',
];
for (const toolset of TOOLSET_NAMES) {
  const tools = resolveToolConfiguration({ rawToolsets: toolset, rawWriteMode: 'full' }).tools;
  lines.push(`## \`${toolset}\` (${tools.length})`, '', '| Tool | Scope | Description |', '|---|---|---|');
  for (const tool of tools) lines.push(`| \`${tool.name}\` | ${tool.writeScope} | ${tool.description.replaceAll('|', '\\|')} |`);
  lines.push('');
}
const generated = `${lines.join('\n').trimEnd()}\n`;
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== generated) { console.error('docs/MCP-TOOLSETS.md is stale'); process.exit(1); }
} else writeFileSync(target, generated);
