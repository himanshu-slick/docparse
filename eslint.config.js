import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'eval/fixtures', 'eval/cache'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { 'max-lines-per-function': ['warn', { max: 30, skipBlankLines: true, skipComments: true }] } },
  { files: ['test/**'], rules: { 'max-lines-per-function': 'off' } },
);
