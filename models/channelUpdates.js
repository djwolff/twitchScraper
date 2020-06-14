var mongoose = require('mongoose');
const lib = require('../helpers/twitchAPI.js');
var Schema = mongoose.Schema;

var ChannelUpdatesSchema = new Schema({
  twitch_channel_id   : Number,
  user_name           : String,
  channel_created_at  : Date,
  channel_updated_at  : Date,
  game                : String,
  followers           : Number,
  views               : Number,
  status              : String,
  language            : String,
  time                : { type : Date, default: Date.now }
});

ChannelUpdatesSchema.statics.findByUser = async function (username) {
  let channel = await this.findOne({
    user_name: username
  });
  return user;
}

// determine if channels has been populated
ChannelUpdatesSchema.statics.exists = async function () {
  let size = await this.collection.countDocuments();
  return size > 0;
}

// save channels
ChannelUpdatesSchema.statics.saveMany = async function (channels) {
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
ChannelUpdatesSchema.statics.getUsers = async function () {
  let user_names = await this.find({}, {user_name:1});
  return user_names.map((user) => user.user_name);
}

const ChannelUpdate = mongoose.model('ChannelUpdate', ChannelUpdatesSchema);

exports.ChannelUpdate = ChannelUpdate;
