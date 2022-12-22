import { D } from '@/lib/fp'
import { Client } from '@elastic/elasticsearch'

import * as utils from './utils'

const INDEX = 'kemono-games'

export const sortDecoder = D.union(D.literal('latest_update'), D.literal('popular'))
export type Sort = D.TypeOf<typeof sortDecoder>

const getBoost = (tag: string, isYiff: boolean) => {
  const namespace = tag.split(':')[0]

  if (isYiff) {
    switch (namespace) {
      case 'type':
        return 8
      case 'species':
        return 8
      case 'lang':
        return 3
      case 'misc':
        return 2
      case 'platform':
      case 'publish':
      case 'sys':
        return 0
      case 'fetish':
      default:
        return 1
    }
  }

  switch (namespace) {
    case 'type':
      return 8
    case 'species':
      return 4
    case 'lang':
      return 10
    case 'misc':
      return 2
    case 'platform':
    case 'publish':
    case 'sys':
      return 0
    case 'fetish':
    default:
      return 1
  }
}

export const similar = (client: Client, tags: string[]) => {
  const isYiff = tags.some((t) => t.includes('yiff'))
  return utils.search(
    client,
    {
      index: INDEX,
      limit: 10,
      body: {
        _source: [],
        query: {
          bool: {
            should: tags.map((tag) => {
              return {
                constant_score: {
                  boost: getBoost(tag, isYiff),
                  filter: {
                    match: {
                      'tags.keyword': tag,
                    },
                  },
                },
              }
            }),
            ...(!isYiff
              ? {
                  must_not: [
                    {
                      match: { 'tags.keyword': 'type:yiff' },
                    },
                  ],
                }
              : {}),
          },
        },
      },
    },
    D.struct({}),
  )
}

export const getRandom = (client: Client, limit = 50) => {
  return utils.search(
    client,
    {
      index: INDEX,
      limit,
      body: {
        _source: [],
        query: {
          bool: {
            must: [
              {
                match: { hidden: false },
              },
            ],
            must_not: [
              {
                match: { 'tags.keyword': 'type:yiff' },
              },
            ],
          },
        },
        sort: {
          _script: {
            script: 'Math.random()',
            type: 'number',
            order: 'asc',
          },
        },
      },
    },
    D.struct({}),
  )
}

export type SearchGamePayloadEs = {
  authorSlug?: string
  includeTags?: string[]
  excludeTags?: string[]
  order?: Sort
  limit?: number
  offset?: number
  strict: boolean
}
export const search = (client: Client, payload: SearchGamePayloadEs) => {
  const { authorSlug, includeTags, excludeTags, order, offset, limit, strict } = {
    includeTags: [],
    excludeTags: [],
    order: 'popular',
    limit: 50,
    offset: 0,
    ...payload,
  }

  const namespaces: { [key: string]: string[] } = {}
  includeTags.forEach((tag) => {
    const [ns, t] = tag.split(':')
    if (!namespaces[ns]) {
      namespaces[ns] = []
    }
    namespaces[ns].push(t)
  })

  const includes = Object.entries(namespaces).map(([ns, tags]) => {
    return {
      bool: {
        should: tags.map((tag) => ({
          match: { 'tags.keyword': `${ns}:${tag}` },
        })),
        minimum_should_match: strict ? tags.length : 1,
      },
    }
  })

  const should = [
    {
      match: { hidden: false },
    },
    ...includes,
  ]

  const query = {
    bool: {
      ...(authorSlug
        ? {
            must: {
              match: { 'authors.keyword': authorSlug },
            },
          }
        : {}),
      should,
      ...(excludeTags.length > 0
        ? {
            must_not: excludeTags.map((tag) => ({
              match: { 'tags.keyword': tag },
            })),
          }
        : {}),
      minimum_should_match: should.length,
    },
  }
  return utils.search(
    client,
    {
      index: INDEX,
      limit,
      offset,
      body: {
        _source: [],
        query,
        sort:
          order === 'latest_update'
            ? [
                {
                  updatedAt: {
                    order: 'desc',
                  },
                },
                {
                  createdAt: {
                    order: 'desc',
                  },
                },
                {
                  hot: {
                    order: 'desc',
                  },
                },
              ]
            : [
                {
                  hot: {
                    order: 'desc',
                  },
                },
                {
                  updatedAt: {
                    order: 'desc',
                  },
                },
                {
                  createdAt: {
                    order: 'desc',
                  },
                },
              ],
      },
    },
    D.struct({}),
  )
}
