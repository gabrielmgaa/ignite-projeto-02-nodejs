import { FastifyInstance } from 'fastify'

import { checkSessionIdeExists } from '../middlewares/check-session-id-exists'

import { randomUUID } from 'crypto'
import z from 'zod'

import { knex } from '../database'

export async function transactionRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [checkSessionIdeExists] }, async (req, res) => {
    const transactions = await knex('transactions').select('*').returning('*')

    return res.send({
      transactions,
    })
  })

  app.get('/:id', { preHandler: [checkSessionIdeExists] }, async (req, res) => {
    const getTransactionParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = getTransactionParamsSchema.parse(req.params)
    const { sessionId } = req.cookies

    const transaction = await knex('transactions')
      .where({
        session_id: sessionId,
        id,
      })
      .first()

    return res.send(transaction)
  })

  app.get(
    '/summary',
    { preHandler: [checkSessionIdeExists] },
    async (req, res) => {
      const { sessionId } = req.cookies

      const summary = await knex('transactions')
        .where('session_id', sessionId)
        .sum('amount', { as: 'amount' })
        .first()

      return res.send({
        summary,
      })
    },
  )

  app.post('/', async (req, res) => {
    const createTransactionBodySchema = z.object({
      title: z.string(),
      amount: z.number(),
      type: z.enum(['credit', 'debit']),
    })

    const { title, amount, type } = createTransactionBodySchema.parse(req.body)

    let sessionId = req.cookies.sessionId

    if (!sessionId) {
      sessionId = randomUUID()

      res.cookie('sessionId', sessionId, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })
    }

    await knex('transactions').insert({
      id: randomUUID(),
      title,
      amount: type === 'credit' ? amount : amount * -1,
      session_id: sessionId,
    })

    return res.status(201).send()
  })
}
