var mongoose = require('mongoose');
const lib = require('../helpers/twitchAPI.js');
var Schema = mongoose.Schema;

var ChannelsSchema = new Schema({
  twitch_channel_id   : Number,
  user_name           : String,
  channel_created_at  : Date,
  channel_updated_at  : Date,
  game                : String,
  followers           : Number,
  views               : Number,
  status              : String,
  language            : String,
});

ChannelsSchema.statics.findByUser = async function (username) {
  let channel = await this.findOne({
    user_name: username
  });
  return channel;
}

// determine if channels has been populated
ChannelsSchema.statics.exists = async function () {
  let size = await this.collection.countDocuments();
  return size > 0;
}

// save channels
ChannelsSchema.statics.saveMany = async function (channels) {
  var refactored = []

  channels.forEach(channel => {
    refactored.push({
      twitch_channel_id: channel._id,
      user_name: channel.name,
      channel_created_at: channel.created_at,
      channel_updated_at: channel.updated_at,
      game: channel.game,
      followers: channel.followers,
      views: channel.views,
      status: channel.status,
      language: channel.language
    })
  });
  let saved_channels = await this.insertMany(refactored);
  return saved_channels
}

// collect user_ids
ChannelsSchema.statics.getUsers = async function () {
  let user_names = await this.find({}, {user_name:1});
  return user_names.map((user) => user.user_name);
}

const Channel = mongoose.model('Channel', ChannelsSchema);

exports.Channel = Channel;
