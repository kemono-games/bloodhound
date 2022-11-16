import { flow, pipe } from 'fp-ts/lib/function'
import { NumberFromString } from 'io-ts-types'
import { ParsedUrlQuery } from 'querystring'

import { A, D, NEA, O, Ord, S, TE } from './fp'

export const kvToUrlQuery = flow(
  (
    xs: {
      k: string
      v: string
    }[],
  ) => {
    type Item = typeof xs[0]
    const ord = Ord.contramap((a: Item) => a.k)(S.Ord)
    return A.sort(ord)(xs)
  },
  NEA.fromArray,
  O.fold(
    () => '',
    (xs) => '?' + xs.map(({ k, v }) => `${k}=${v}`).join('&'),
  ),
)

export const sortDecoder = D.union(
  D.literal('latest_update'),
  D.literal('popular'),
)
export type Sort = D.TypeOf<typeof sortDecoder>
export const DEFAULT_SORT: Sort = 'popular'
export const searchPayloadDecoder = D.partial({
  page: D.number,
  filter: D.array(D.string),
  sort: sortDecoder,
  tagSlug: D.string,
  authorSlug: D.string,
})
export type SearchPayload = D.TypeOf<typeof searchPayloadDecoder>

export const filterURLQueryCodec = {
  decode: (q: ParsedUrlQuery) =>
    pipe(
      D.partial({ filter: D.string, tagSlug: D.string }).decode(q),
      O.fromEither,
      O.map(({ filter, tagSlug }) => {
        const items = filter?.split(',').map((a) => decodeURIComponent(a)) ?? []
        if (tagSlug) items.push(tagSlug)
        return items
      }),
      O.getOrElse((): string[] => []),
    ),
  encode: (filter: string[], tagSlug?: string) =>
    pipe(
      NEA.fromArray(filter),
      O.map((v) => ({
        k: 'filter',
        v: v
          .filter((e) => e !== tagSlug)
          .sort()
          .join(','),
      })),
    ),
}

export const searchParamsUrlQueryCodec = {
  decode: (q: ParsedUrlQuery): SearchPayload => {
    const basicQuery = {
      page: pipe(
        NumberFromString.decode(q['page']),
        O.fromEither,
        O.toUndefined,
      ),
      sort: pipe(sortDecoder.decode(q['sort']), O.fromEither, O.toUndefined),
      filter: filterURLQueryCodec.decode(q),
      tagSlug: pipe(D.string.decode(q['tagSlug']), O.fromEither, O.toUndefined),
      authorSlug: pipe(
        D.string.decode(q['authorSlug']),
        O.fromEither,
        O.toUndefined,
      ),
    }
    return basicQuery
  },
  encode: (query: SearchPayload) =>
    pipe(
      [
        pipe(
          O.fromNullable(query.sort),
          O.filter((a) => a !== DEFAULT_SORT),
          O.map((v) => ({ k: 'sort', v })),
        ),
        pipe(
          O.fromNullable(query.page),
          O.filter((a) => a !== 1),
          O.map((v) => ({ k: 'page', v: `${v}` })),
        ),
        filterURLQueryCodec.encode(query.filter ?? [], query.tagSlug),
      ],
      A.compact,
      kvToUrlQuery,
    ),
}

export const specialTags = {
  released: ['misc:work-in-process', 'misc:died', 'misc:suspended'],
  'non-h': ['type:yiff'],
}

export const getEntitiesFromDBByIds = <DBEntity extends { id: number }>(
  ids: number[],
  fetch: (ids: number[]) => TE.TaskEither<string, DBEntity[]>,
) => {
  return pipe(
    fetch(ids),
    TE.map((resp) => {
      const map: Record<number, DBEntity> = {}
      for (const entity of resp) {
        map[entity.id] = entity
      }
      const data: DBEntity[] = []
      for (const id of ids) {
        const item = map[id]
        if (item) data.push(item)
      }
      return data
    }),
  )
}

export const getEntitiesMapFromDBByIds = <DBEntity extends { id: number }>(
  ids: number[],
  fetch: (ids: number[]) => TE.TaskEither<string, DBEntity[]>,
) => {
  return pipe(
    fetch(ids),
    TE.map((resp) => {
      const map: Record<number, DBEntity> = {}
      for (const entity of resp) {
        map[entity.id] = entity
      }
      return map
    }),
  )
}

export const getEntitiesFromDBByESEntities = <
  ESEntity extends { id: string },
  DBEntity extends { id: number },
>(
  src: { data: ESEntity[]; total: number },
  fetch: (ids: number[]) => TE.TaskEither<string, DBEntity[]>,
) => {
  const ids = src.data.map((a) => parseInt(a.id))
  return pipe(
    getEntitiesFromDBByIds(ids, fetch),
    TE.map((data) => ({ data, total: src.total })),
  )
}
