var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  twitch_user_id      : Number,
  user_name           : String,
  user_created_at     : Date,
  user_updated_at     : Date,
  bio                 : String,
});

UserSchema.statics.findByUser = async function (username) {
  let channel = await this.findOne({
    user_name: username
  });
  return user;
}

const User = mongoose.model('User', UserSchema);

exports.User = User;
