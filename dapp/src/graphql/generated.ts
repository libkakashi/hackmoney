import {GraphQLClient, RequestOptions} from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends {[key: string]: unknown}> = {[K in keyof T]: T[K]};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<T extends {[key: string]: unknown}, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | {[P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never};
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: {input: string; output: string};
  String: {input: string; output: string};
  Boolean: {input: boolean; output: boolean};
  Int: {input: number; output: number};
  Float: {input: number; output: number};
  jsonb: {input: any; output: any};
  numeric: {input: any; output: any};
  timestamptz: {input: any; output: any};
};

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type BooleanComparisonExp = {
  _eq?: InputMaybe<Scalars['Boolean']['input']>;
  _gt?: InputMaybe<Scalars['Boolean']['input']>;
  _gte?: InputMaybe<Scalars['Boolean']['input']>;
  _in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Boolean']['input']>;
  _lte?: InputMaybe<Scalars['Boolean']['input']>;
  _neq?: InputMaybe<Scalars['Boolean']['input']>;
  _nin?: InputMaybe<Array<Scalars['Boolean']['input']>>;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type IntComparisonExp = {
  _eq?: InputMaybe<Scalars['Int']['input']>;
  _gt?: InputMaybe<Scalars['Int']['input']>;
  _gte?: InputMaybe<Scalars['Int']['input']>;
  _in?: InputMaybe<Array<Scalars['Int']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['Int']['input']>;
  _lte?: InputMaybe<Scalars['Int']['input']>;
  _neq?: InputMaybe<Scalars['Int']['input']>;
  _nin?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** columns and relationships of "Launchpad_TokenLaunched" */
export type LaunchpadTokenLaunched = {
  __typename: 'Launchpad_TokenLaunched';
  address: Scalars['String']['output'];
  auction: Scalars['String']['output'];
  auctionClaimBlock: Scalars['numeric']['output'];
  auctionEndBlock: Scalars['numeric']['output'];
  auctionStartBlock: Scalars['numeric']['output'];
  createdAt: Scalars['Int']['output'];
  createdAtBlock: Scalars['numeric']['output'];
  creator: Scalars['String']['output'];
  description: Scalars['String']['output'];
  discordUrl?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  image: Scalars['String']['output'];
  name: Scalars['String']['output'];
  poolMigrationBlock: Scalars['numeric']['output'];
  salt: Scalars['String']['output'];
  strategy: Scalars['String']['output'];
  symbol: Scalars['String']['output'];
  telegramUrl?: Maybe<Scalars['String']['output']>;
  twitterUrl?: Maybe<Scalars['String']['output']>;
  txHash: Scalars['String']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

/** Boolean expression to filter rows from the table "Launchpad_TokenLaunched". All fields are combined with a logical 'AND'. */
export type LaunchpadTokenLaunchedBoolExp = {
  _and?: InputMaybe<Array<LaunchpadTokenLaunchedBoolExp>>;
  _not?: InputMaybe<LaunchpadTokenLaunchedBoolExp>;
  _or?: InputMaybe<Array<LaunchpadTokenLaunchedBoolExp>>;
  address?: InputMaybe<StringComparisonExp>;
  auction?: InputMaybe<StringComparisonExp>;
  auctionClaimBlock?: InputMaybe<NumericComparisonExp>;
  auctionEndBlock?: InputMaybe<NumericComparisonExp>;
  auctionStartBlock?: InputMaybe<NumericComparisonExp>;
  createdAt?: InputMaybe<IntComparisonExp>;
  createdAtBlock?: InputMaybe<NumericComparisonExp>;
  creator?: InputMaybe<StringComparisonExp>;
  description?: InputMaybe<StringComparisonExp>;
  discordUrl?: InputMaybe<StringComparisonExp>;
  id?: InputMaybe<StringComparisonExp>;
  image?: InputMaybe<StringComparisonExp>;
  name?: InputMaybe<StringComparisonExp>;
  poolMigrationBlock?: InputMaybe<NumericComparisonExp>;
  salt?: InputMaybe<StringComparisonExp>;
  strategy?: InputMaybe<StringComparisonExp>;
  symbol?: InputMaybe<StringComparisonExp>;
  telegramUrl?: InputMaybe<StringComparisonExp>;
  twitterUrl?: InputMaybe<StringComparisonExp>;
  txHash?: InputMaybe<StringComparisonExp>;
  website?: InputMaybe<StringComparisonExp>;
};

/** Ordering options when selecting data from "Launchpad_TokenLaunched". */
export type LaunchpadTokenLaunchedOrderBy = {
  address?: InputMaybe<OrderBy>;
  auction?: InputMaybe<OrderBy>;
  auctionClaimBlock?: InputMaybe<OrderBy>;
  auctionEndBlock?: InputMaybe<OrderBy>;
  auctionStartBlock?: InputMaybe<OrderBy>;
  createdAt?: InputMaybe<OrderBy>;
  createdAtBlock?: InputMaybe<OrderBy>;
  creator?: InputMaybe<OrderBy>;
  description?: InputMaybe<OrderBy>;
  discordUrl?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  image?: InputMaybe<OrderBy>;
  name?: InputMaybe<OrderBy>;
  poolMigrationBlock?: InputMaybe<OrderBy>;
  salt?: InputMaybe<OrderBy>;
  strategy?: InputMaybe<OrderBy>;
  symbol?: InputMaybe<OrderBy>;
  telegramUrl?: InputMaybe<OrderBy>;
  twitterUrl?: InputMaybe<OrderBy>;
  txHash?: InputMaybe<OrderBy>;
  website?: InputMaybe<OrderBy>;
};

/** select columns of table "Launchpad_TokenLaunched" */
export type LaunchpadTokenLaunchedSelectColumn =
  /** column name */
  | 'address'
  /** column name */
  | 'auction'
  /** column name */
  | 'auctionClaimBlock'
  /** column name */
  | 'auctionEndBlock'
  /** column name */
  | 'auctionStartBlock'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'createdAtBlock'
  /** column name */
  | 'creator'
  /** column name */
  | 'description'
  /** column name */
  | 'discordUrl'
  /** column name */
  | 'id'
  /** column name */
  | 'image'
  /** column name */
  | 'name'
  /** column name */
  | 'poolMigrationBlock'
  /** column name */
  | 'salt'
  /** column name */
  | 'strategy'
  /** column name */
  | 'symbol'
  /** column name */
  | 'telegramUrl'
  /** column name */
  | 'twitterUrl'
  /** column name */
  | 'txHash'
  /** column name */
  | 'website';

/** Streaming cursor of the table "Launchpad_TokenLaunched" */
export type LaunchpadTokenLaunchedStreamCursorInput = {
  /** Stream column input with initial value */
  initial_value: LaunchpadTokenLaunchedStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type LaunchpadTokenLaunchedStreamCursorValueInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  auction?: InputMaybe<Scalars['String']['input']>;
  auctionClaimBlock?: InputMaybe<Scalars['numeric']['input']>;
  auctionEndBlock?: InputMaybe<Scalars['numeric']['input']>;
  auctionStartBlock?: InputMaybe<Scalars['numeric']['input']>;
  createdAt?: InputMaybe<Scalars['Int']['input']>;
  createdAtBlock?: InputMaybe<Scalars['numeric']['input']>;
  creator?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  discordUrl?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  image?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  poolMigrationBlock?: InputMaybe<Scalars['numeric']['input']>;
  salt?: InputMaybe<Scalars['String']['input']>;
  strategy?: InputMaybe<Scalars['String']['input']>;
  symbol?: InputMaybe<Scalars['String']['input']>;
  telegramUrl?: InputMaybe<Scalars['String']['input']>;
  twitterUrl?: InputMaybe<Scalars['String']['input']>;
  txHash?: InputMaybe<Scalars['String']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type StringComparisonExp = {
  _eq?: InputMaybe<Scalars['String']['input']>;
  _gt?: InputMaybe<Scalars['String']['input']>;
  _gte?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given case-insensitive pattern */
  _ilike?: InputMaybe<Scalars['String']['input']>;
  _in?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: InputMaybe<Scalars['String']['input']>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  /** does the column match the given pattern */
  _like?: InputMaybe<Scalars['String']['input']>;
  _lt?: InputMaybe<Scalars['String']['input']>;
  _lte?: InputMaybe<Scalars['String']['input']>;
  _neq?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: InputMaybe<Scalars['String']['input']>;
  _nin?: InputMaybe<Array<Scalars['String']['input']>>;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given pattern */
  _nlike?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: InputMaybe<Scalars['String']['input']>;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: InputMaybe<Scalars['String']['input']>;
  /** does the column match the given SQL regular expression */
  _similar?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "TokenHolder" */
export type TokenHolder = {
  __typename: 'TokenHolder';
  balance: Scalars['numeric']['output'];
  id: Scalars['String']['output'];
  lastUpdatedAt: Scalars['Int']['output'];
  token: Scalars['String']['output'];
  totalReceived: Scalars['numeric']['output'];
  totalSent: Scalars['numeric']['output'];
  transferCount: Scalars['Int']['output'];
  wallet: Scalars['String']['output'];
};

/** Boolean expression to filter rows from the table "TokenHolder". All fields are combined with a logical 'AND'. */
export type TokenHolderBoolExp = {
  _and?: InputMaybe<Array<TokenHolderBoolExp>>;
  _not?: InputMaybe<TokenHolderBoolExp>;
  _or?: InputMaybe<Array<TokenHolderBoolExp>>;
  balance?: InputMaybe<NumericComparisonExp>;
  id?: InputMaybe<StringComparisonExp>;
  lastUpdatedAt?: InputMaybe<IntComparisonExp>;
  token?: InputMaybe<StringComparisonExp>;
  totalReceived?: InputMaybe<NumericComparisonExp>;
  totalSent?: InputMaybe<NumericComparisonExp>;
  transferCount?: InputMaybe<IntComparisonExp>;
  wallet?: InputMaybe<StringComparisonExp>;
};

/** Ordering options when selecting data from "TokenHolder". */
export type TokenHolderOrderBy = {
  balance?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  lastUpdatedAt?: InputMaybe<OrderBy>;
  token?: InputMaybe<OrderBy>;
  totalReceived?: InputMaybe<OrderBy>;
  totalSent?: InputMaybe<OrderBy>;
  transferCount?: InputMaybe<OrderBy>;
  wallet?: InputMaybe<OrderBy>;
};

/** select columns of table "TokenHolder" */
export type TokenHolderSelectColumn =
  /** column name */
  | 'balance'
  /** column name */
  | 'id'
  /** column name */
  | 'lastUpdatedAt'
  /** column name */
  | 'token'
  /** column name */
  | 'totalReceived'
  /** column name */
  | 'totalSent'
  /** column name */
  | 'transferCount'
  /** column name */
  | 'wallet';

/** Streaming cursor of the table "TokenHolder" */
export type TokenHolderStreamCursorInput = {
  /** Stream column input with initial value */
  initial_value: TokenHolderStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type TokenHolderStreamCursorValueInput = {
  balance?: InputMaybe<Scalars['numeric']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  lastUpdatedAt?: InputMaybe<Scalars['Int']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
  totalReceived?: InputMaybe<Scalars['numeric']['input']>;
  totalSent?: InputMaybe<Scalars['numeric']['input']>;
  transferCount?: InputMaybe<Scalars['Int']['input']>;
  wallet?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "Token_Transfer" */
export type TokenTransfer = {
  __typename: 'Token_Transfer';
  amount: Scalars['numeric']['output'];
  blockNumber: Scalars['Int']['output'];
  from: Scalars['String']['output'];
  id: Scalars['String']['output'];
  timestamp: Scalars['Int']['output'];
  to: Scalars['String']['output'];
  token: Scalars['String']['output'];
  txHash: Scalars['String']['output'];
};

/** Boolean expression to filter rows from the table "Token_Transfer". All fields are combined with a logical 'AND'. */
export type TokenTransferBoolExp = {
  _and?: InputMaybe<Array<TokenTransferBoolExp>>;
  _not?: InputMaybe<TokenTransferBoolExp>;
  _or?: InputMaybe<Array<TokenTransferBoolExp>>;
  amount?: InputMaybe<NumericComparisonExp>;
  blockNumber?: InputMaybe<IntComparisonExp>;
  from?: InputMaybe<StringComparisonExp>;
  id?: InputMaybe<StringComparisonExp>;
  timestamp?: InputMaybe<IntComparisonExp>;
  to?: InputMaybe<StringComparisonExp>;
  token?: InputMaybe<StringComparisonExp>;
  txHash?: InputMaybe<StringComparisonExp>;
};

/** Ordering options when selecting data from "Token_Transfer". */
export type TokenTransferOrderBy = {
  amount?: InputMaybe<OrderBy>;
  blockNumber?: InputMaybe<OrderBy>;
  from?: InputMaybe<OrderBy>;
  id?: InputMaybe<OrderBy>;
  timestamp?: InputMaybe<OrderBy>;
  to?: InputMaybe<OrderBy>;
  token?: InputMaybe<OrderBy>;
  txHash?: InputMaybe<OrderBy>;
};

/** select columns of table "Token_Transfer" */
export type TokenTransferSelectColumn =
  /** column name */
  | 'amount'
  /** column name */
  | 'blockNumber'
  /** column name */
  | 'from'
  /** column name */
  | 'id'
  /** column name */
  | 'timestamp'
  /** column name */
  | 'to'
  /** column name */
  | 'token'
  /** column name */
  | 'txHash';

/** Streaming cursor of the table "Token_Transfer" */
export type TokenTransferStreamCursorInput = {
  /** Stream column input with initial value */
  initial_value: TokenTransferStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type TokenTransferStreamCursorValueInput = {
  amount?: InputMaybe<Scalars['numeric']['input']>;
  blockNumber?: InputMaybe<Scalars['Int']['input']>;
  from?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['String']['input']>;
  timestamp?: InputMaybe<Scalars['Int']['input']>;
  to?: InputMaybe<Scalars['String']['input']>;
  token?: InputMaybe<Scalars['String']['input']>;
  txHash?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "_meta" */
export type Meta = {
  __typename: '_meta';
  bufferBlock?: Maybe<Scalars['Int']['output']>;
  chainId?: Maybe<Scalars['Int']['output']>;
  endBlock?: Maybe<Scalars['Int']['output']>;
  eventsProcessed?: Maybe<Scalars['Int']['output']>;
  firstEventBlock?: Maybe<Scalars['Int']['output']>;
  isReady?: Maybe<Scalars['Boolean']['output']>;
  progressBlock?: Maybe<Scalars['Int']['output']>;
  readyAt?: Maybe<Scalars['timestamptz']['output']>;
  sourceBlock?: Maybe<Scalars['Int']['output']>;
  startBlock?: Maybe<Scalars['Int']['output']>;
};

/** Boolean expression to filter rows from the table "_meta". All fields are combined with a logical 'AND'. */
export type MetaBoolExp = {
  _and?: InputMaybe<Array<MetaBoolExp>>;
  _not?: InputMaybe<MetaBoolExp>;
  _or?: InputMaybe<Array<MetaBoolExp>>;
  bufferBlock?: InputMaybe<IntComparisonExp>;
  chainId?: InputMaybe<IntComparisonExp>;
  endBlock?: InputMaybe<IntComparisonExp>;
  eventsProcessed?: InputMaybe<IntComparisonExp>;
  firstEventBlock?: InputMaybe<IntComparisonExp>;
  isReady?: InputMaybe<BooleanComparisonExp>;
  progressBlock?: InputMaybe<IntComparisonExp>;
  readyAt?: InputMaybe<TimestamptzComparisonExp>;
  sourceBlock?: InputMaybe<IntComparisonExp>;
  startBlock?: InputMaybe<IntComparisonExp>;
};

/** Ordering options when selecting data from "_meta". */
export type MetaOrderBy = {
  bufferBlock?: InputMaybe<OrderBy>;
  chainId?: InputMaybe<OrderBy>;
  endBlock?: InputMaybe<OrderBy>;
  eventsProcessed?: InputMaybe<OrderBy>;
  firstEventBlock?: InputMaybe<OrderBy>;
  isReady?: InputMaybe<OrderBy>;
  progressBlock?: InputMaybe<OrderBy>;
  readyAt?: InputMaybe<OrderBy>;
  sourceBlock?: InputMaybe<OrderBy>;
  startBlock?: InputMaybe<OrderBy>;
};

/** select columns of table "_meta" */
export type MetaSelectColumn =
  /** column name */
  | 'bufferBlock'
  /** column name */
  | 'chainId'
  /** column name */
  | 'endBlock'
  /** column name */
  | 'eventsProcessed'
  /** column name */
  | 'firstEventBlock'
  /** column name */
  | 'isReady'
  /** column name */
  | 'progressBlock'
  /** column name */
  | 'readyAt'
  /** column name */
  | 'sourceBlock'
  /** column name */
  | 'startBlock';

/** Streaming cursor of the table "_meta" */
export type MetaStreamCursorInput = {
  /** Stream column input with initial value */
  initial_value: MetaStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type MetaStreamCursorValueInput = {
  bufferBlock?: InputMaybe<Scalars['Int']['input']>;
  chainId?: InputMaybe<Scalars['Int']['input']>;
  endBlock?: InputMaybe<Scalars['Int']['input']>;
  eventsProcessed?: InputMaybe<Scalars['Int']['input']>;
  firstEventBlock?: InputMaybe<Scalars['Int']['input']>;
  isReady?: InputMaybe<Scalars['Boolean']['input']>;
  progressBlock?: InputMaybe<Scalars['Int']['input']>;
  readyAt?: InputMaybe<Scalars['timestamptz']['input']>;
  sourceBlock?: InputMaybe<Scalars['Int']['input']>;
  startBlock?: InputMaybe<Scalars['Int']['input']>;
};

/** columns and relationships of "chain_metadata" */
export type ChainMetadata = {
  __typename: 'chain_metadata';
  block_height?: Maybe<Scalars['Int']['output']>;
  chain_id?: Maybe<Scalars['Int']['output']>;
  end_block?: Maybe<Scalars['Int']['output']>;
  first_event_block_number?: Maybe<Scalars['Int']['output']>;
  is_hyper_sync?: Maybe<Scalars['Boolean']['output']>;
  latest_fetched_block_number?: Maybe<Scalars['Int']['output']>;
  latest_processed_block?: Maybe<Scalars['Int']['output']>;
  num_batches_fetched?: Maybe<Scalars['Int']['output']>;
  num_events_processed?: Maybe<Scalars['Int']['output']>;
  start_block?: Maybe<Scalars['Int']['output']>;
  timestamp_caught_up_to_head_or_endblock?: Maybe<
    Scalars['timestamptz']['output']
  >;
};

/** Boolean expression to filter rows from the table "chain_metadata". All fields are combined with a logical 'AND'. */
export type ChainMetadataBoolExp = {
  _and?: InputMaybe<Array<ChainMetadataBoolExp>>;
  _not?: InputMaybe<ChainMetadataBoolExp>;
  _or?: InputMaybe<Array<ChainMetadataBoolExp>>;
  block_height?: InputMaybe<IntComparisonExp>;
  chain_id?: InputMaybe<IntComparisonExp>;
  end_block?: InputMaybe<IntComparisonExp>;
  first_event_block_number?: InputMaybe<IntComparisonExp>;
  is_hyper_sync?: InputMaybe<BooleanComparisonExp>;
  latest_fetched_block_number?: InputMaybe<IntComparisonExp>;
  latest_processed_block?: InputMaybe<IntComparisonExp>;
  num_batches_fetched?: InputMaybe<IntComparisonExp>;
  num_events_processed?: InputMaybe<IntComparisonExp>;
  start_block?: InputMaybe<IntComparisonExp>;
  timestamp_caught_up_to_head_or_endblock?: InputMaybe<TimestamptzComparisonExp>;
};

/** Ordering options when selecting data from "chain_metadata". */
export type ChainMetadataOrderBy = {
  block_height?: InputMaybe<OrderBy>;
  chain_id?: InputMaybe<OrderBy>;
  end_block?: InputMaybe<OrderBy>;
  first_event_block_number?: InputMaybe<OrderBy>;
  is_hyper_sync?: InputMaybe<OrderBy>;
  latest_fetched_block_number?: InputMaybe<OrderBy>;
  latest_processed_block?: InputMaybe<OrderBy>;
  num_batches_fetched?: InputMaybe<OrderBy>;
  num_events_processed?: InputMaybe<OrderBy>;
  start_block?: InputMaybe<OrderBy>;
  timestamp_caught_up_to_head_or_endblock?: InputMaybe<OrderBy>;
};

/** select columns of table "chain_metadata" */
export type ChainMetadataSelectColumn =
  /** column name */
  | 'block_height'
  /** column name */
  | 'chain_id'
  /** column name */
  | 'end_block'
  /** column name */
  | 'first_event_block_number'
  /** column name */
  | 'is_hyper_sync'
  /** column name */
  | 'latest_fetched_block_number'
  /** column name */
  | 'latest_processed_block'
  /** column name */
  | 'num_batches_fetched'
  /** column name */
  | 'num_events_processed'
  /** column name */
  | 'start_block'
  /** column name */
  | 'timestamp_caught_up_to_head_or_endblock';

/** Streaming cursor of the table "chain_metadata" */
export type ChainMetadataStreamCursorInput = {
  /** Stream column input with initial value */
  initial_value: ChainMetadataStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type ChainMetadataStreamCursorValueInput = {
  block_height?: InputMaybe<Scalars['Int']['input']>;
  chain_id?: InputMaybe<Scalars['Int']['input']>;
  end_block?: InputMaybe<Scalars['Int']['input']>;
  first_event_block_number?: InputMaybe<Scalars['Int']['input']>;
  is_hyper_sync?: InputMaybe<Scalars['Boolean']['input']>;
  latest_fetched_block_number?: InputMaybe<Scalars['Int']['input']>;
  latest_processed_block?: InputMaybe<Scalars['Int']['input']>;
  num_batches_fetched?: InputMaybe<Scalars['Int']['input']>;
  num_events_processed?: InputMaybe<Scalars['Int']['input']>;
  start_block?: InputMaybe<Scalars['Int']['input']>;
  timestamp_caught_up_to_head_or_endblock?: InputMaybe<
    Scalars['timestamptz']['input']
  >;
};

/** ordering argument of a cursor */
export type CursorOrdering =
  /** ascending ordering of the cursor */
  | 'ASC'
  /** descending ordering of the cursor */
  | 'DESC';

export type JsonbCastExp = {
  String?: InputMaybe<StringComparisonExp>;
};

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export type JsonbComparisonExp = {
  _cast?: InputMaybe<JsonbCastExp>;
  /** is the column contained in the given json value */
  _contained_in?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the column contain the given json value at the top level */
  _contains?: InputMaybe<Scalars['jsonb']['input']>;
  _eq?: InputMaybe<Scalars['jsonb']['input']>;
  _gt?: InputMaybe<Scalars['jsonb']['input']>;
  _gte?: InputMaybe<Scalars['jsonb']['input']>;
  /** does the string exist as a top-level key in the column */
  _has_key?: InputMaybe<Scalars['String']['input']>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: InputMaybe<Array<Scalars['String']['input']>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: InputMaybe<Array<Scalars['String']['input']>>;
  _in?: InputMaybe<Array<Scalars['jsonb']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['jsonb']['input']>;
  _lte?: InputMaybe<Scalars['jsonb']['input']>;
  _neq?: InputMaybe<Scalars['jsonb']['input']>;
  _nin?: InputMaybe<Array<Scalars['jsonb']['input']>>;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type NumericComparisonExp = {
  _eq?: InputMaybe<Scalars['numeric']['input']>;
  _gt?: InputMaybe<Scalars['numeric']['input']>;
  _gte?: InputMaybe<Scalars['numeric']['input']>;
  _in?: InputMaybe<Array<Scalars['numeric']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['numeric']['input']>;
  _lte?: InputMaybe<Scalars['numeric']['input']>;
  _neq?: InputMaybe<Scalars['numeric']['input']>;
  _nin?: InputMaybe<Array<Scalars['numeric']['input']>>;
};

/** column ordering options */
export type OrderBy =
  /** in ascending order, nulls last */
  | 'asc'
  /** in ascending order, nulls first */
  | 'asc_nulls_first'
  /** in ascending order, nulls last */
  | 'asc_nulls_last'
  /** in descending order, nulls first */
  | 'desc'
  /** in descending order, nulls first */
  | 'desc_nulls_first'
  /** in descending order, nulls last */
  | 'desc_nulls_last';

export type QueryRoot = {
  __typename: 'query_root';
  /** fetch data from the table: "Launchpad_TokenLaunched" */
  Launchpad_TokenLaunched: Array<LaunchpadTokenLaunched>;
  /** fetch data from the table: "Launchpad_TokenLaunched" using primary key columns */
  Launchpad_TokenLaunched_by_pk?: Maybe<LaunchpadTokenLaunched>;
  /** fetch data from the table: "TokenHolder" */
  TokenHolder: Array<TokenHolder>;
  /** fetch data from the table: "TokenHolder" using primary key columns */
  TokenHolder_by_pk?: Maybe<TokenHolder>;
  /** fetch data from the table: "Token_Transfer" */
  Token_Transfer: Array<TokenTransfer>;
  /** fetch data from the table: "Token_Transfer" using primary key columns */
  Token_Transfer_by_pk?: Maybe<TokenTransfer>;
  /** fetch data from the table: "_meta" */
  _meta: Array<Meta>;
  /** fetch data from the table: "chain_metadata" */
  chain_metadata: Array<ChainMetadata>;
  /** fetch data from the table: "raw_events" */
  raw_events: Array<RawEvents>;
  /** fetch data from the table: "raw_events" using primary key columns */
  raw_events_by_pk?: Maybe<RawEvents>;
};

export type QueryRootLaunchpadTokenLaunchedArgs = {
  distinct_on?: InputMaybe<Array<LaunchpadTokenLaunchedSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<LaunchpadTokenLaunchedOrderBy>>;
  where?: InputMaybe<LaunchpadTokenLaunchedBoolExp>;
};

export type QueryRootLaunchpadTokenLaunchedByPkArgs = {
  id: Scalars['String']['input'];
};

export type QueryRootTokenHolderArgs = {
  distinct_on?: InputMaybe<Array<TokenHolderSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<TokenHolderOrderBy>>;
  where?: InputMaybe<TokenHolderBoolExp>;
};

export type QueryRootTokenHolderByPkArgs = {
  id: Scalars['String']['input'];
};

export type QueryRootTokenTransferArgs = {
  distinct_on?: InputMaybe<Array<TokenTransferSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<TokenTransferOrderBy>>;
  where?: InputMaybe<TokenTransferBoolExp>;
};

export type QueryRootTokenTransferByPkArgs = {
  id: Scalars['String']['input'];
};

export type QueryRootMetaArgs = {
  distinct_on?: InputMaybe<Array<MetaSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<MetaOrderBy>>;
  where?: InputMaybe<MetaBoolExp>;
};

export type QueryRootChainMetadataArgs = {
  distinct_on?: InputMaybe<Array<ChainMetadataSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<ChainMetadataOrderBy>>;
  where?: InputMaybe<ChainMetadataBoolExp>;
};

export type QueryRootRawEventsArgs = {
  distinct_on?: InputMaybe<Array<RawEventsSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<RawEventsOrderBy>>;
  where?: InputMaybe<RawEventsBoolExp>;
};

export type QueryRootRawEventsByPkArgs = {
  serial: Scalars['Int']['input'];
};

/** columns and relationships of "raw_events" */
export type RawEvents = {
  __typename: 'raw_events';
  block_fields: Scalars['jsonb']['output'];
  block_hash: Scalars['String']['output'];
  block_number: Scalars['Int']['output'];
  block_timestamp: Scalars['Int']['output'];
  chain_id: Scalars['Int']['output'];
  contract_name: Scalars['String']['output'];
  event_id: Scalars['numeric']['output'];
  event_name: Scalars['String']['output'];
  log_index: Scalars['Int']['output'];
  params: Scalars['jsonb']['output'];
  serial: Scalars['Int']['output'];
  src_address: Scalars['String']['output'];
  transaction_fields: Scalars['jsonb']['output'];
};

/** columns and relationships of "raw_events" */
export type RawEventsBlockFieldsArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "raw_events" */
export type RawEventsParamsArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** columns and relationships of "raw_events" */
export type RawEventsTransactionFieldsArgs = {
  path?: InputMaybe<Scalars['String']['input']>;
};

/** Boolean expression to filter rows from the table "raw_events". All fields are combined with a logical 'AND'. */
export type RawEventsBoolExp = {
  _and?: InputMaybe<Array<RawEventsBoolExp>>;
  _not?: InputMaybe<RawEventsBoolExp>;
  _or?: InputMaybe<Array<RawEventsBoolExp>>;
  block_fields?: InputMaybe<JsonbComparisonExp>;
  block_hash?: InputMaybe<StringComparisonExp>;
  block_number?: InputMaybe<IntComparisonExp>;
  block_timestamp?: InputMaybe<IntComparisonExp>;
  chain_id?: InputMaybe<IntComparisonExp>;
  contract_name?: InputMaybe<StringComparisonExp>;
  event_id?: InputMaybe<NumericComparisonExp>;
  event_name?: InputMaybe<StringComparisonExp>;
  log_index?: InputMaybe<IntComparisonExp>;
  params?: InputMaybe<JsonbComparisonExp>;
  serial?: InputMaybe<IntComparisonExp>;
  src_address?: InputMaybe<StringComparisonExp>;
  transaction_fields?: InputMaybe<JsonbComparisonExp>;
};

/** Ordering options when selecting data from "raw_events". */
export type RawEventsOrderBy = {
  block_fields?: InputMaybe<OrderBy>;
  block_hash?: InputMaybe<OrderBy>;
  block_number?: InputMaybe<OrderBy>;
  block_timestamp?: InputMaybe<OrderBy>;
  chain_id?: InputMaybe<OrderBy>;
  contract_name?: InputMaybe<OrderBy>;
  event_id?: InputMaybe<OrderBy>;
  event_name?: InputMaybe<OrderBy>;
  log_index?: InputMaybe<OrderBy>;
  params?: InputMaybe<OrderBy>;
  serial?: InputMaybe<OrderBy>;
  src_address?: InputMaybe<OrderBy>;
  transaction_fields?: InputMaybe<OrderBy>;
};

/** select columns of table "raw_events" */
export type RawEventsSelectColumn =
  /** column name */
  | 'block_fields'
  /** column name */
  | 'block_hash'
  /** column name */
  | 'block_number'
  /** column name */
  | 'block_timestamp'
  /** column name */
  | 'chain_id'
  /** column name */
  | 'contract_name'
  /** column name */
  | 'event_id'
  /** column name */
  | 'event_name'
  /** column name */
  | 'log_index'
  /** column name */
  | 'params'
  /** column name */
  | 'serial'
  /** column name */
  | 'src_address'
  /** column name */
  | 'transaction_fields';

/** Streaming cursor of the table "raw_events" */
export type RawEventsStreamCursorInput = {
  /** Stream column input with initial value */
  initial_value: RawEventsStreamCursorValueInput;
  /** cursor ordering */
  ordering?: InputMaybe<CursorOrdering>;
};

/** Initial value of the column from where the streaming should start */
export type RawEventsStreamCursorValueInput = {
  block_fields?: InputMaybe<Scalars['jsonb']['input']>;
  block_hash?: InputMaybe<Scalars['String']['input']>;
  block_number?: InputMaybe<Scalars['Int']['input']>;
  block_timestamp?: InputMaybe<Scalars['Int']['input']>;
  chain_id?: InputMaybe<Scalars['Int']['input']>;
  contract_name?: InputMaybe<Scalars['String']['input']>;
  event_id?: InputMaybe<Scalars['numeric']['input']>;
  event_name?: InputMaybe<Scalars['String']['input']>;
  log_index?: InputMaybe<Scalars['Int']['input']>;
  params?: InputMaybe<Scalars['jsonb']['input']>;
  serial?: InputMaybe<Scalars['Int']['input']>;
  src_address?: InputMaybe<Scalars['String']['input']>;
  transaction_fields?: InputMaybe<Scalars['jsonb']['input']>;
};

export type SubscriptionRoot = {
  __typename: 'subscription_root';
  /** fetch data from the table: "Launchpad_TokenLaunched" */
  Launchpad_TokenLaunched: Array<LaunchpadTokenLaunched>;
  /** fetch data from the table: "Launchpad_TokenLaunched" using primary key columns */
  Launchpad_TokenLaunched_by_pk?: Maybe<LaunchpadTokenLaunched>;
  /** fetch data from the table in a streaming manner: "Launchpad_TokenLaunched" */
  Launchpad_TokenLaunched_stream: Array<LaunchpadTokenLaunched>;
  /** fetch data from the table: "TokenHolder" */
  TokenHolder: Array<TokenHolder>;
  /** fetch data from the table: "TokenHolder" using primary key columns */
  TokenHolder_by_pk?: Maybe<TokenHolder>;
  /** fetch data from the table in a streaming manner: "TokenHolder" */
  TokenHolder_stream: Array<TokenHolder>;
  /** fetch data from the table: "Token_Transfer" */
  Token_Transfer: Array<TokenTransfer>;
  /** fetch data from the table: "Token_Transfer" using primary key columns */
  Token_Transfer_by_pk?: Maybe<TokenTransfer>;
  /** fetch data from the table in a streaming manner: "Token_Transfer" */
  Token_Transfer_stream: Array<TokenTransfer>;
  /** fetch data from the table: "_meta" */
  _meta: Array<Meta>;
  /** fetch data from the table in a streaming manner: "_meta" */
  _meta_stream: Array<Meta>;
  /** fetch data from the table: "chain_metadata" */
  chain_metadata: Array<ChainMetadata>;
  /** fetch data from the table in a streaming manner: "chain_metadata" */
  chain_metadata_stream: Array<ChainMetadata>;
  /** fetch data from the table: "raw_events" */
  raw_events: Array<RawEvents>;
  /** fetch data from the table: "raw_events" using primary key columns */
  raw_events_by_pk?: Maybe<RawEvents>;
  /** fetch data from the table in a streaming manner: "raw_events" */
  raw_events_stream: Array<RawEvents>;
};

export type SubscriptionRootLaunchpadTokenLaunchedArgs = {
  distinct_on?: InputMaybe<Array<LaunchpadTokenLaunchedSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<LaunchpadTokenLaunchedOrderBy>>;
  where?: InputMaybe<LaunchpadTokenLaunchedBoolExp>;
};

export type SubscriptionRootLaunchpadTokenLaunchedByPkArgs = {
  id: Scalars['String']['input'];
};

export type SubscriptionRootLaunchpadTokenLaunchedStreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<LaunchpadTokenLaunchedStreamCursorInput>>;
  where?: InputMaybe<LaunchpadTokenLaunchedBoolExp>;
};

export type SubscriptionRootTokenHolderArgs = {
  distinct_on?: InputMaybe<Array<TokenHolderSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<TokenHolderOrderBy>>;
  where?: InputMaybe<TokenHolderBoolExp>;
};

export type SubscriptionRootTokenHolderByPkArgs = {
  id: Scalars['String']['input'];
};

export type SubscriptionRootTokenHolderStreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<TokenHolderStreamCursorInput>>;
  where?: InputMaybe<TokenHolderBoolExp>;
};

export type SubscriptionRootTokenTransferArgs = {
  distinct_on?: InputMaybe<Array<TokenTransferSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<TokenTransferOrderBy>>;
  where?: InputMaybe<TokenTransferBoolExp>;
};

export type SubscriptionRootTokenTransferByPkArgs = {
  id: Scalars['String']['input'];
};

export type SubscriptionRootTokenTransferStreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<TokenTransferStreamCursorInput>>;
  where?: InputMaybe<TokenTransferBoolExp>;
};

export type SubscriptionRootMetaArgs = {
  distinct_on?: InputMaybe<Array<MetaSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<MetaOrderBy>>;
  where?: InputMaybe<MetaBoolExp>;
};

export type SubscriptionRootMetaStreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<MetaStreamCursorInput>>;
  where?: InputMaybe<MetaBoolExp>;
};

export type SubscriptionRootChainMetadataArgs = {
  distinct_on?: InputMaybe<Array<ChainMetadataSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<ChainMetadataOrderBy>>;
  where?: InputMaybe<ChainMetadataBoolExp>;
};

export type SubscriptionRootChainMetadataStreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<ChainMetadataStreamCursorInput>>;
  where?: InputMaybe<ChainMetadataBoolExp>;
};

export type SubscriptionRootRawEventsArgs = {
  distinct_on?: InputMaybe<Array<RawEventsSelectColumn>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order_by?: InputMaybe<Array<RawEventsOrderBy>>;
  where?: InputMaybe<RawEventsBoolExp>;
};

export type SubscriptionRootRawEventsByPkArgs = {
  serial: Scalars['Int']['input'];
};

export type SubscriptionRootRawEventsStreamArgs = {
  batch_size: Scalars['Int']['input'];
  cursor: Array<InputMaybe<RawEventsStreamCursorInput>>;
  where?: InputMaybe<RawEventsBoolExp>;
};

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export type TimestamptzComparisonExp = {
  _eq?: InputMaybe<Scalars['timestamptz']['input']>;
  _gt?: InputMaybe<Scalars['timestamptz']['input']>;
  _gte?: InputMaybe<Scalars['timestamptz']['input']>;
  _in?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
  _is_null?: InputMaybe<Scalars['Boolean']['input']>;
  _lt?: InputMaybe<Scalars['timestamptz']['input']>;
  _lte?: InputMaybe<Scalars['timestamptz']['input']>;
  _neq?: InputMaybe<Scalars['timestamptz']['input']>;
  _nin?: InputMaybe<Array<Scalars['timestamptz']['input']>>;
};

export type GetTokensQueryVariables = Exact<{
  limit: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
}>;

export type GetTokensQuery = {
  __typename: 'query_root';
  Launchpad_TokenLaunched: Array<{
    __typename: 'Launchpad_TokenLaunched';
    id: string;
    address: string;
    strategy: string;
    auction: string;
    creator: string;
    name: string;
    symbol: string;
    description: string;
    website?: string | null;
    twitterUrl?: string | null;
    discordUrl?: string | null;
    telegramUrl?: string | null;
    image: string;
    auctionStartBlock: any;
    auctionEndBlock: any;
    auctionClaimBlock: any;
    poolMigrationBlock: any;
    salt: string;
    createdAt: number;
    createdAtBlock: any;
    txHash: string;
  }>;
};

export type GetTokenHoldersByBalanceQueryVariables = Exact<{
  token: Scalars['String']['input'];
  limit: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
}>;

export type GetTokenHoldersByBalanceQuery = {
  __typename: 'query_root';
  TokenHolder: Array<{
    __typename: 'TokenHolder';
    id: string;
    token: string;
    wallet: string;
    balance: any;
    totalSent: any;
    totalReceived: any;
    transferCount: number;
    lastUpdatedAt: number;
  }>;
};

export type GetTokenHoldersByVolumeQueryVariables = Exact<{
  token: Scalars['String']['input'];
  limit: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
}>;

export type GetTokenHoldersByVolumeQuery = {
  __typename: 'query_root';
  TokenHolder: Array<{
    __typename: 'TokenHolder';
    id: string;
    token: string;
    wallet: string;
    balance: any;
    totalSent: any;
    totalReceived: any;
    transferCount: number;
    lastUpdatedAt: number;
  }>;
};

export type GetTokenByAddressQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;

export type GetTokenByAddressQuery = {
  __typename: 'query_root';
  Launchpad_TokenLaunched: Array<{
    __typename: 'Launchpad_TokenLaunched';
    id: string;
    address: string;
    strategy: string;
    auction: string;
    creator: string;
    name: string;
    symbol: string;
    description: string;
    website?: string | null;
    twitterUrl?: string | null;
    discordUrl?: string | null;
    telegramUrl?: string | null;
    image: string;
    auctionStartBlock: any;
    auctionEndBlock: any;
    auctionClaimBlock: any;
    poolMigrationBlock: any;
    salt: string;
    createdAt: number;
    createdAtBlock: any;
    txHash: string;
  }>;
};

export const GetTokensDocument = gql`
  query GetTokens($limit: Int!, $offset: Int!) {
    Launchpad_TokenLaunched(
      limit: $limit
      offset: $offset
      order_by: {createdAt: desc}
    ) {
      id
      address
      strategy
      auction
      creator
      name
      symbol
      description
      website
      twitterUrl
      discordUrl
      telegramUrl
      image
      auctionStartBlock
      auctionEndBlock
      auctionClaimBlock
      poolMigrationBlock
      salt
      createdAt
      createdAtBlock
      txHash
    }
  }
`;
export const GetTokenHoldersByBalanceDocument = gql`
  query GetTokenHoldersByBalance($token: String!, $limit: Int!, $offset: Int!) {
    TokenHolder(
      where: {token: {_eq: $token}, balance: {_gt: "0"}}
      order_by: {balance: desc}
      limit: $limit
      offset: $offset
    ) {
      id
      token
      wallet
      balance
      totalSent
      totalReceived
      transferCount
      lastUpdatedAt
    }
  }
`;
export const GetTokenHoldersByVolumeDocument = gql`
  query GetTokenHoldersByVolume($token: String!, $limit: Int!, $offset: Int!) {
    TokenHolder(
      where: {token: {_eq: $token}}
      order_by: {totalSent: desc}
      limit: $limit
      offset: $offset
    ) {
      id
      token
      wallet
      balance
      totalSent
      totalReceived
      transferCount
      lastUpdatedAt
    }
  }
`;
export const GetTokenByAddressDocument = gql`
  query GetTokenByAddress($token: String!) {
    Launchpad_TokenLaunched(where: {address: {_eq: $token}}) {
      id
      address
      strategy
      auction
      creator
      name
      symbol
      description
      website
      twitterUrl
      discordUrl
      telegramUrl
      image
      auctionStartBlock
      auctionEndBlock
      auctionClaimBlock
      poolMigrationBlock
      salt
      createdAt
      createdAtBlock
      txHash
    }
  }
`;

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string,
  variables?: any,
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType,
  _variables,
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper,
) {
  return {
    GetTokens(
      variables: GetTokensQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetTokensQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GetTokensQuery>({
            document: GetTokensDocument,
            variables,
            requestHeaders: {...requestHeaders, ...wrappedRequestHeaders},
            signal,
          }),
        'GetTokens',
        'query',
        variables,
      );
    },
    GetTokenHoldersByBalance(
      variables: GetTokenHoldersByBalanceQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetTokenHoldersByBalanceQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GetTokenHoldersByBalanceQuery>({
            document: GetTokenHoldersByBalanceDocument,
            variables,
            requestHeaders: {...requestHeaders, ...wrappedRequestHeaders},
            signal,
          }),
        'GetTokenHoldersByBalance',
        'query',
        variables,
      );
    },
    GetTokenHoldersByVolume(
      variables: GetTokenHoldersByVolumeQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetTokenHoldersByVolumeQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GetTokenHoldersByVolumeQuery>({
            document: GetTokenHoldersByVolumeDocument,
            variables,
            requestHeaders: {...requestHeaders, ...wrappedRequestHeaders},
            signal,
          }),
        'GetTokenHoldersByVolume',
        'query',
        variables,
      );
    },
    GetTokenByAddress(
      variables: GetTokenByAddressQueryVariables,
      requestHeaders?: GraphQLClientRequestHeaders,
      signal?: RequestInit['signal'],
    ): Promise<GetTokenByAddressQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<GetTokenByAddressQuery>({
            document: GetTokenByAddressDocument,
            variables,
            requestHeaders: {...requestHeaders, ...wrappedRequestHeaders},
            signal,
          }),
        'GetTokenByAddress',
        'query',
        variables,
      );
    },
  };
}
export type Sdk = ReturnType<typeof getSdk>;
