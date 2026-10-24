#!/usr/bin/env node
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { withCache } from './cache/index.js';
import { extract } from './extract/extractor.js';
import { fileToText } from './extract/pdf.js';
import { getProvider, PROVIDER_NAMES } from './providers/index.js';
import { DOC_TYPES, detectDocType, type DocType } from './schemas/index.js';

const USAGE = `Usage: docparse extract <file.pdf|image> [--model ${PROVIDER_NAMES.join('|')}] [--type ${DOC_TYPES.join('|')}] [--no-cache]`;

function resolveType(flag: string | undefined, text: string): DocType {
  const type = flag ?? detectDocType(text);
  if (!type || !DOC_TYPES.includes(type as DocType)) {
    throw new Error(`could not detect document type; pass --type ${DOC_TYPES.join('|')}`);
  }
  return type as DocType;
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      model: { type: 'string', default: 'gemini' },
      type: { type: 'string' },
      'no-cache': { type: 'boolean', default: false },
    },
  });
  const [command, file] = positionals;
  if (command !== 'extract' || !file) {
    console.error(USAGE);
    return 2;
  }
  const text = await fileToText(file);
  const base = getProvider(values.model);
  const provider = values['no-cache'] ? base : withCache(base, { dir: '.cache/docparse' });
  const result = await extract(provider, resolveType(values.type, text), text);
  console.log(JSON.stringify(result.data, null, 2));
  if (!result.valid) console.error(`schema validation failed after ${result.attempts} attempts:\n${result.error}`);
  return result.valid ? 0 : 1;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err: Error) => {
    console.error(`error: ${err.message}`);
    process.exit(1);
  },
);
