import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import hpp from 'hpp'
import morgan from 'morgan'

import { CREDENTIALS, LOG_FORMAT, NODE_ENV, ORIGIN, PORT } from '@/config'
import errorMiddleware from '@/middlewares/error.middleware'
import indexRoute from '@/routes/index.route'
import { logger, stream } from '@/utils/logger'
import validateEnv from '@/utils/validateEnv'

validateEnv()

const app = express()
const env = NODE_ENV || 'development'
const port = PORT || 3000

app.use(morgan(LOG_FORMAT, { stream }))
app.use(cors({ origin: ORIGIN, credentials: CREDENTIALS }))
app.use(hpp())
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/health', (_, res) => res.send('OK'))
app.use('/api', indexRoute)

app.use(errorMiddleware)

app.listen(port, () => {
  logger.info(`=================================`)
  logger.info(`======= ENV: ${env} =======`)
  logger.info(`🚀 App listening on the port ${port}`)
  logger.info(`=================================`)
})
