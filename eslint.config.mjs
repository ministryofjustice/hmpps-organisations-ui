import hmppsConfig from '@ministryofjustice/eslint-config-hmpps'

export default [
  ...hmppsConfig(),
  {
    files: ['**/*.ts'],
    rules: {
      // permissions are bitmasks
      'no-bitwise': 'off',
    },
  },
  {
    // the audit Page enum lives in routes/index.ts, which mounts the handlers that use it
    files: ['server/routes/**/*.ts'],
    rules: { 'import/no-cycle': 'off' },
  },
]
