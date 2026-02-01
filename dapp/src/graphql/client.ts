import {GraphQLClient} from 'graphql-request';
import {getSdk} from './generated';

export const getGraphqlClient = (apiUrl: string) => {
  return getSdk(new GraphQLClient(apiUrl));
};
