import { D } from '@/lib/fp'

export type AttrsSearchOptions = Record<
  string,
  | {
      type: 'text'
      options: { key: string; doc_count: number }[]
    }
  | {
      type: 'double'
      minmax: [number, number]
    }
>

export const attrKeywordsFilterDecoder = D.array(D.string)
export type AttrKeywordsFilter = D.TypeOf<typeof attrKeywordsFilterDecoder>
export const attrMinMaxFilterDecoder = D.tuple(
  D.nullable(D.number),
  D.nullable(D.number),
)
export type AttrMinMaxFilter = D.TypeOf<typeof attrMinMaxFilterDecoder>
export const attrsFilterDecoder = D.record(
  D.union(attrKeywordsFilterDecoder, attrMinMaxFilterDecoder),
)
export type AttrsFilter = D.TypeOf<typeof attrsFilterDecoder>
