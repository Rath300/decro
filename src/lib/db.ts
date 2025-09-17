import Dexie, { Table } from 'dexie'

export interface CachedPost {
  id: string
  type: string
  title: string
  imageUrl: string
  aspectRatio: 'square' | 'portrait' | 'landscape'
  audioUrl?: string
  videoUrl?: string
  creator: string
  date: string
  isCurated?: boolean
  views: number
  subgroupId?: string | null
}

export interface CachedLike { postId: string; userId: string }
export interface CachedComment { id?: number; postId: string; userId: string; content: string; createdAt: number }

export type OutboxAction =
  | { id?: number; type: 'like'; postId: string; userId: string; add: boolean }
  | { id?: number; type: 'comment'; postId: string; userId: string; content: string }

export class LocalDb extends Dexie {
  posts!: Table<CachedPost, string>
  likes!: Table<CachedLike, [string, string]> // [postId, userId]
  comments!: Table<CachedComment, number>
  outbox!: Table<OutboxAction, number>

  constructor() {
    super('decro-local')
    // v1: initial schema; v2: add subgroupId to posts index
    this.version(1).stores({
      posts: 'id, date',
      likes: '[postId+userId]',
      comments: '++id, postId, userId, createdAt',
      outbox: '++id,type',
    })
    this.version(2).stores({
      posts: 'id, date, subgroupId',
      likes: '[postId+userId]',
      comments: '++id, postId, userId, createdAt',
      outbox: '++id,type',
    }).upgrade(tx => {
      return (tx.table('posts') as any).toCollection().modify((p: any) => {
        if (p.subgroupId === undefined) p.subgroupId = null
      })
    })
  }
}

const db = new LocalDb()
export default db



