import Dexie, { Table } from 'dexie'

interface PostRow {
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
}

interface LikeRow {
  postId: string
  userId: string
}

interface CommentRow {
  id?: number
  postId: string
  userId: string
  content: string
  createdAt: number
}

type OutboxJob =
  | { id?: number; type: 'like'; postId: string; userId: string; add: boolean }
  | { id?: number; type: 'comment'; postId: string; userId: string; content: string }

class LocalDB extends Dexie {
  posts!: Table<PostRow, string>
  likes!: Table<LikeRow, [string, string]>
  comments!: Table<CommentRow, number>
  outbox!: Table<OutboxJob, number>

  constructor() {
    super('decro')
    this.version(1).stores({
      posts: 'id,date',
      likes: '[postId+userId]',
      comments: '++id,postId,createdAt',
      outbox: '++id,type,postId',
    })
  }
}

const db = new LocalDB()

export default db



