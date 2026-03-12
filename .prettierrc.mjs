// typescript
//
// https://www.npmjs.com/package/@ianvs/prettier-plugin-sort-imports
// @ianvs/prettier-plugin-sort-imports 與 prettier-plugin-import-sort 相差無幾
// @ianvs/prettier-plugin-sort-imports 沒有區分大小寫
// @ianvs/prettier-plugin-sort-imports 可以客製化
export default {
  singleQuote: true,
  trailingComma: 'all',
  plugins: ['@ianvs/prettier-plugin-sort-imports'],

  // @ianvs/prettier-plugin-sort-imports
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderTypeScriptVersion: '5.7.3',
  importOrder: ['<BUILTIN_MODULES>', '', '<THIRD_PARTY_MODULES>', '', '^[.]'],
};
