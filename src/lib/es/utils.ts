import { Client } from '@elastic/elasticsearch'
import {
  Id,
  SearchResponse as ESSearchResponse,
} from '@elastic/elasticsearch/lib/api/types'
import { pipe } from 'fp-ts/lib/function'

import { D, E, O, TE } from '@/lib/fp'

export type SourceWithId<Source extends Record<string, unknown>> = {
  id: Id
} & Source
export type SearchPayload<Body extends Record<string, unknown>> = {
  index: string
  offset?: number
  limit?: number
  body: Body
  track_total_hits?: boolean
}
export type SearchResponse<Source extends Record<string, unknown>> = {
  data: SourceWithId<Source>[]
  total: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 1000

export const search = <
  Source extends Record<string, unknown>,
  SearchBody extends Record<string, unknown>,
>(
  client: Client,
  payload: SearchPayload<SearchBody>,
  sourceDecoder: D.Decoder<unknown, Source>,
) =>
  pipe(
    TE.tryCatch(
      () =>
        client.search<ESSearchResponse<Source>>({
          index: payload.index,
          from: payload.offset ?? 0,
          size: Math.min(payload.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
          body: payload.body,
          ...pipe(
            O.fromNullable(payload.track_total_hits),
            O.map((track_total_hits) => ({ track_total_hits })),
            O.getOrElse((): object | undefined => undefined),
          ),
        }),
      (e) => {
        console.error(e)
        return 'es bad response'
      },
    ),
    TE.chainEitherK((resp) => {
      const total = (resp.hits.total as { value: number }).value
      const data: SourceWithId<Source>[] = []
      for (const hit of resp.hits.hits) {
        const decoded = sourceDecoder.decode(hit._source)
        if (E.isLeft(decoded)) {
          console.error(new Error(D.draw(decoded.left)))
          return E.left('es bad response data')
        }
        data.push({ id: hit._id, ...decoded.right })
      }
      return E.right({ data, total })
    }),
  )
