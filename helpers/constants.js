module.exports = {
  category_columns: ['game_id', 'channels', 'viewers', 'name'],
  streamer_columns: [
    'user_id',
    'name',
    'user_created_at',
    'user_updated_at',
    'bio',
    'twitch_type'
  ],
  channel_columns: [
    'channel_id',
    'username',
    'channel_created_at',
    'channel_updated_at',
    'game',
    'followers',
    'views',
    'status',
    'language',
    'partner',
    'description',
    'url',
    'mature'
  ],
  webhook_columns: [
    'topic',
    'callback',
    'expires_at'
  ],
  stream_columns: [
    'stream_id',
    'username',
    'user_id',
    'game_id',
    'started_at',
    'tag_ids',
    'title',
    'type',
    'language',
    'viewer_count',
  ],
  follow_columns: [
    'created_at',
    'channel_id',
    'user_id',
    'user_name',
    'user_created_at',
    'user_updated_at',
    'user_type',
    'notifications'
  ]
}
