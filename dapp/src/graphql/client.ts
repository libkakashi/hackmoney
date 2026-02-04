import {GraphQLClient} from 'graphql-request';
import {getSdk} from './generated';
import {env} from '~/lib/env';

export const graphqlClient = getSdk(new GraphQLClient(env.graphqlUrl));
