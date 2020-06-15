var mongoose = require('mongoose');
const lib = require('../helpers/twitchAPI.js');
var Schema = mongoose.Schema;

var StreamsSchema = new Schema({
  stream_id          : Number,
  user_name           : String,
  user_id             : Number,
  game_id             : Number,
  started_at          : Date,
  tag_ids             : [String],
  title               : String,
  type                : String,
  language            : String,
  viewer_count        : Number,
}, {
  timestamps : { createdAt: 'created_at', updatedAt: false }
});

StreamsSchema.statics.findByUser = async function (username) {
  let stream = await this.findOne({
    user_name: username
  });
  return stream;
}

// determine if streams has been populated
StreamsSchema.statics.exists = async function () {
  let size = await this.collection.countDocuments();
  return size > 0;
}

// save stream
StreamsSchema.statics.save = async function (stream, that) {
  var now = new Date();
  console.log(`saving ${stream.user_name}'s stream at time: ${now.toLocaleString()}`);
  let saved_stream = await that.insertMany([{
      stream_id: stream.id,
      user_name: stream.user_name,
      user_id: stream.user_id,
      game_id: stream.game_id,
      started_at: stream.started_at,
      tag_ids: stream.tag_ids,
      title: stream.title,
      type: stream.type,
      language: stream.language,
      viewer_count: stream.viewer_count,
  }]);
  return saved_stream;
}

StreamsSchema.statics.followStreamWebhook = async function (stream) {
  // get most recent stream update within db of this stream
  var that = this;

  return await this.find({stream_id: stream.id, started_at: stream.started_at})
  .limit(1)
  .then(async items => {
    if(items.length == 0) {
      // if we aren't following it already, follow it !!
      console.log(`following stream of ${stream.user_name}`);
      await timeoutFollowStream(stream.user_name, that);
    } else {
      console.log('stream is already being followed');
    }
  });
}

StreamsSchema.statics.followStream = async function (username) {
  var that = this;
  // console.log(this);
  await timeoutFollowStream(username, that);
}

StreamsSchema.statics.getAll = async function () {
  let documents = await Stream.find({});
  return documents;
}

async function timeoutFollowStream(user_name, that) {
  // get stream from twitch api
  let user = await lib.getUsers([user_name]);
  var user_id = user.data[0].id;

  // console.log(user);
  let ms_stream = await lib.getStream(user_name);
  // let kraken_stream = await lib.krakenGetStream(user_id);
  // console.log(kraken_stream);
  // var curr_views = kraken_stream.stream.viewers;

  var data = ms_stream["data"];
  // console.log("ms_stream", ms_stream);

  // console.log("data", data);

  // TODO: TEST WHEN STREAM CHANGES (name, whatever )
  if(data.length == 0) {
    var now = new Date();
    console.log(`Stream ended at ${now.toLocaleString()}`);
    return
  }
  // save stream
  let saved_stream = await StreamsSchema.statics.save(data[0], that);

  // call this function again in a minute
  // console.log('setting timeout');
  setTimeout(timeoutFollowStream, 60 * 1000 * 5, user_name, that);
}

const Stream = mongoose.model('Stream', StreamsSchema);

exports.Stream = Stream;
