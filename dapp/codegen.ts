import * as dotenv from 'dotenv';
import type {CodegenConfig} from '@graphql-codegen/cli';

dotenv.config();

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    'src/graphql/generated.ts': {
      schema: process.env.NEXT_PUBLIC_GRAPHQL_URL,
      documents: 'src/graphql/queries.graphql',
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-graphql-request',
      ],
      config: {
        useIndexSignature: true,
        enumsAsTypes: true,
        skipTypename: false,
        exportFragmentSpreadSubTypes: true,
        dedupeFragments: true,
        inlineFragmentTypes: 'combine',
        nonOptionalTypename: true,
        preResolveTypes: true,
        namingConvention: {
          typeNames: 'pascal-case#pascalCase',
          enumValues: 'upper-case#upperCase',
        },
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
