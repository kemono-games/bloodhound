import { Client } from '@elastic/elasticsearch'

export * as game from './game'
export * as utils from './utils'

export const client = new Client({
  nodes: [process.env.ELASTIC_SEARCH_ENDPOINT ?? 'http://localhost:9200'],
})
