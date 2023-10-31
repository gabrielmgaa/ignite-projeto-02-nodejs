import 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    transactions: {
      id: string
      title: string
      created_at: string
      amount: number

      session_id?: string
    }
  }
}
