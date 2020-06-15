var mongoose = require('mongoose');
const lib = require('../helpers/twitchAPI.js');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  twitch_user_id      : Number,
  user_name           : String,
  user_created_at     : Date,
  user_updated_at     : Date,
  bio                 : String,
  type                : String
});

UserSchema.statics.findByUser = async function (username) {
  let channel = await this.findOne({
    user_name: username
  });
  return user;
}

// determine if users has been populated
UserSchema.statics.exists = async function () {
  let size = await this.collection.countDocuments();
  return size > 0;
}

// save users (gonna try recursion)
UserSchema.statics.saveMany = async function (users) {
  refactored = []

  // find users using twitch api
  let found_users = (await lib.getUsers(users)).users;

  found_users.forEach(user => {
    refactored.push({
      twitch_user_id: user._id,
      user_name: user.name,
      user_created_at: user.created_at,
      user_updated_at: user.updated_at,
      bio: user.bio,
      type: user.type
    })
  });
  let saved_users = await this.insertMany(refactored);
  return saved_users
}

UserSchema.statics.getAll = async function () {
  let documents = await User.find({});
  return documents;
}

const User = mongoose.model('User', UserSchema);

exports.User = User;
