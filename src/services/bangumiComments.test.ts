import assert from 'node:assert/strict'
import {
  buildBangumiPrivateCommentsUrl,
  formatBangumiCommentError,
  getBangumiCommentPageState,
  mapBangumiSubjectComments,
} from './bangumiComments.js'

assert.equal(
  buildBangumiPrivateCommentsUrl({ kind: 'subject', id: 13 }),
  'https://next.bgm.tv/p1/subjects/13/comments?limit=24&offset=0'
)
assert.equal(
  buildBangumiPrivateCommentsUrl({ kind: 'subject', id: 13 }, { limit: 100, offset: 25, type: 2 }),
  'https://next.bgm.tv/p1/subjects/13/comments?type=2&limit=100&offset=25'
)
assert.equal(
  buildBangumiPrivateCommentsUrl({ kind: 'subject', id: 13 }, { limit: 500, offset: -10 }),
  'https://next.bgm.tv/p1/subjects/13/comments?limit=100&offset=0'
)

const comments = mapBangumiSubjectComments({
  data: [
    {
      id: 101,
      type: 2,
      rate: 9,
      comment: '很长的春天，最后还是回到了家。',
      updatedAt: 1714564800,
      reactions: [{ value: 1 }],
      user: {
        id: 42,
        username: 'nagisa',
        nickname: '古河渚',
        avatar: { small: '', medium: '', large: '' },
      },
    },
    {
      id: 102,
      type: 4,
      rate: 0,
      comment: '   ',
      updatedAt: 1714564900,
      user: {
        id: 43,
        username: 'empty',
        nickname: '',
      },
    },
    {
      id: 103,
      type: 5,
      rate: 0,
      comment: '系统太慢，先抛弃。',
      updatedAt: 0,
      user: {
        id: 44,
        username: 'dropper',
        nickname: '',
      },
    },
  ],
  total: 3,
})

assert.equal(comments.total, 3)
assert.equal(comments.comments.length, 2)
assert.equal(comments.comments[0].id, '101')
assert.equal(comments.comments[0].author, '古河渚')
assert.equal(comments.comments[0].authorUrl, 'https://bgm.tv/user/nagisa')
assert.equal(comments.comments[0].status, '玩过')
assert.equal(comments.comments[0].rating, '9')
assert.equal(comments.comments[0].time, '2024-05-01 20:00')
assert.equal(comments.comments[0].body, '很长的春天，最后还是回到了家。')
assert.equal(comments.comments[1].author, 'dropper')
assert.equal(comments.comments[1].status, '抛弃')
assert.equal(comments.comments[1].time, '')

assert.equal(formatBangumiCommentError(401), 'Bangumi 吐槽接口需要登录或有效令牌')
assert.equal(formatBangumiCommentError(403), 'Bangumi 吐槽接口拒绝访问')
assert.equal(formatBangumiCommentError(500), 'Bangumi 吐槽接口暂时不可用：500')

assert.deepEqual(getBangumiCommentPageState(49, 12, 24), {
  page: 3,
  totalPages: 5,
  from: 25,
  to: 36,
  hasPrev: true,
  hasNext: true,
})

assert.deepEqual(getBangumiCommentPageState(0, 12, 0), {
  page: 1,
  totalPages: 1,
  from: 0,
  to: 0,
  hasPrev: false,
  hasNext: false,
})
