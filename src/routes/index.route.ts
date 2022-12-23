import { Router } from 'express'
import { pipe } from 'fp-ts/lib/function'

import * as es from '@/lib/es'
import { D, E, TE } from '@/lib/fp'
import { sortDecoder } from '@/lib/search'

const router = Router()

export const localeDecoder = D.union(D.literal('en'), D.literal('zh-Hans'), D.literal('zh-Hant'), D.literal('ja'))
router.all('/searchGames', async (req, res) => {
  const task = pipe(
    pipe(
      D.struct({
        strict: D.boolean,
        locale: localeDecoder,
      }),
      D.intersect(
        D.partial({
          includeTags: D.array(D.string),
          excludeTags: D.array(D.string),
          order: sortDecoder,
          offset: D.number,
          limit: D.number,
          authorSlug: D.string,
        }),
      ),
    ).decode(req.body),
    E.mapLeft(() => 'bad request'),
    TE.fromEither,
    TE.chain((payload) => es.game.search(es.client, payload)),
  )
  res.status(200).json(await task())
})

router.all('/getSimilar', async (req, res) => {
  const task = pipe(
    D.struct({
      tags: D.array(D.string),
    }).decode(req.body),
    E.mapLeft(() => 'bad request'),
    TE.fromEither,
    TE.chain((payload) => es.game.similar(es.client, payload.tags)),
  )
  res.status(200).json(await task())
})

router.all('/getRandom', async (req, res) => {
  const task = pipe(es.game.getRandom(es.client))
  res.status(200).json(await task())
})

export default router
