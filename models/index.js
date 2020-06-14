var mongoose = require('mongoose');
var Channel = require('./channels.js');
var User = require('./users.js');
var ChannelUpdate = require('./channelUpdates.js') ;

const connectDb = () => {
  return mongoose.connect(process.env.DATABASE_URL,
                        {useNewUrlParser: true, useUnifiedTopology: true});
};
User = User["User"];
Channel = Channel["Channel"];
ChannelUpdate = ChannelUpdate["ChannelUpdate"];

exports.connectDb = connectDb;
exports.models = { Channel, User, ChannelUpdate };
