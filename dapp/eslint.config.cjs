module.exports = [
  {
    ignores: [
      'build/',
      'generated/',
      'ui/',
      'public/',
      'next-env.d.ts',
      'generated.ts',
    ],
  },
  ...require('gts'),
];
