var mongoose = require('mongoose');
const json2csv = require('json2csv').parse;
var path = require('path');
var fs = require('fs');

var Channel = require('./channels.js');
var User = require('./users.js');
var ChannelUpdate = require('./channelUpdates.js');
var Stream = require('./streams.js');
var Webhook = require('./webhooks.js');


const connectDb = () => {
  return mongoose.connect(process.env.DATABASE_URL,
                        {useNewUrlParser: true, useUnifiedTopology: true});
};

const downloadCSV = async (collection) => {
  const dateTime = new Date().toISOString().slice(-24).replace(/\D/g, '').slice(0, 14);
  const filePath = path.join(__dirname, "../", "exports", collection + dateTime + ".csv");
  const fields = Object.keys(mongoose.modelSchemas[collection].obj)

  let csv;

  let docs = await mongoose.modelSchemas[collection].statics.getAll();

  try {
    csv = json2csv(docs, {fields});
  } catch (err) {
    console.log(err);
    return
  }

  fs.writeFile(filePath, csv, function(err) {
    if(err) { return console.log(err)};
    console.log('File was saved !');
  })
  // const documents = await
}

User = User["User"];
Channel = Channel["Channel"];
ChannelUpdate = ChannelUpdate["ChannelUpdate"];
Stream = Stream["Stream"];
Webhook = Webhook["Webhook"];

exports.connectDb = connectDb;
exports.downloadCSV = downloadCSV;
exports.models = {Channel,
                  User,
                  ChannelUpdate,
                  Stream,
                  Webhook};
