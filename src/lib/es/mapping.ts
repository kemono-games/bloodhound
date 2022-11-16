import { pipe } from 'fp-ts/lib/function'

import { A, D, O } from '@/lib/fp'

export const esMappingDecoder = pipe(
  D.array(
    D.struct({
      type: D.string,
      es_key: D.string,
      name: D.string,
    }),
  ),
  D.map(
    A.filterMap((attr) =>
      pipe(
        D.union(
          D.literal('text'),
          D.literal('double'),
          D.literal('date'),
        ).decode(attr.type),
        O.fromEither,
        O.map((type) => ({ ...attr, type })),
      ),
    ),
  ),
)
export type EsMapping = D.TypeOf<typeof esMappingDecoder>
