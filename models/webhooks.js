var mongoose = require('mongoose');
const lib = require('../helpers/twitchAPI.js');
var Schema = mongoose.Schema;

var WebhookSchema = new Schema({
  topic               : String,
  callback            : String,
  expires_at          : Date
}, {
  timestamps : { createdAt: 'created_at', updatedAt: false }
});

// determine if Webhooks has been populated
WebhookSchema.statics.exists = async function () {
  let size = await this.collection.countDocuments();
  return size > 0;
}

// save Webhooks (gonna try recursion)
WebhookSchema.statics.saveAndVerify = async function (subs, curr) {
  var found= undefined;
  subs.forEach(sub => {
    if (sub.topic == curr) {found = sub}
  })

  if (found) {
    let saved_webhook = await this.insertMany([{
      topic: found.topic,
      callback: found.callback,
      expires_at: found.expires_at
    }])
  }

  return found;
}

const Webhook = mongoose.model('Webhook', WebhookSchema);

exports.Webhook = Webhook;
