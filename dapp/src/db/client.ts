import {Kysely, PostgresDialect} from 'kysely';
import pg from 'pg';
import type {DB} from './generated';
import {env} from '~/lib/env';

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    connectionString: env.databaseUrl,
    max: 10,
  }),
});

export const db = new Kysely<DB>({dialect});
