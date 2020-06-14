const express = require("express");
const bodyParser = require("body-parser");
const request = require('request-promise');
var schedule = require('node-schedule');

const lib = require('./helpers/twitchAPI.js');
const db_fn = require('./models/index.js');

require('dotenv').config();    // for client secrets
const app = express();

// Tell express to use body-parser's JSON parsing
app.use(bodyParser.json())

app.get("/webhooks/stream-changed", async (req, res) => {
  // recieve hub.challenge
  // console.log("Subscring to stream! -- ", req.query);
  res.send(req.query['hub.challenge']);

  // now check our subscriptions to see if are actually subbed
  var subs = (await lib.getWebhooks()).data;
  console.log("now currently subbed to these webhooks: --", subs);

  // TODO: save webhooks
  var found = false;
  subs.forEach(sub => {
    if (sub.topic == req.query["hub.topic"]) {found = true}
  })
  if (!found) {console.log("Problem with returning challenge")}
  else {console.log("challenge successful")};
})

app.post("/webhooks/stream-changed", (req, res) => {
  console.log("A stream has been updated!");
  console.log(req.body); // -> offline = data = [], online = data = channel

  // TODO: Save in streams table every time it changes
  // TODO: start saving messages table with streams_id
  res.status(200).end() // Responding is important
})

async function setupDB() {
  lib.getChannels(20)
  .then(async (channels) => {
    // console.log(JSON.stringify(channels.channels, null, 2));
    // GRAB TOP 20 STREAMERS (channels)
    const channel_exists = await db_fn.models.Channel.exists();
    if (!channel_exists) {
      const saved_channels = await db_fn.models.Channel.saveMany(channels.channels);
      console.log("saved channels!");
    }

    users = await db_fn.models.Channel.getUsers(); // return user ids
    return users
  })
  .then(async (usernames) => {
    // SAVE USERS AND RECORD CHANGES
    const users_exists = await db_fn.models.User.exists();
    if (!users_exists) {
      const saved_users = await db_fn.models.User.saveMany(usernames);
      console.log("saved users!");
    }
  })
  .catch(err => console.log(err));
}

async function casestudy(username) {
  lib.subscribeToUserStream(username);
}

// Start express on the defined port
db_fn.connectDb().then(async () => {
  // await setupDB();
  // console.log("finished setting up DB!");

  // case study --> follow one streamer
  await casestudy("djwolff123");

  // await setupWebhooks();
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`))
})

// job runs every saturday at midnight
var j = schedule.scheduleJob('0 0 * * 6', function() {
  console.log("do something ok");

  // every week unsubscribe to webhooks and resubscribe -- (10 days is lease count)
  /* every week we want:
    1. top 20 streamers (we will only follow these)
    2. for each streamer -> record # of followers
    3. for each streamer -> record # of subs
    4. for each streamer -> record total chat count on streams
    5. for each streamer -> record # of donations
    6. for each streamer -> record total amount of views on streams
    7. for each streamer -> record type of streams / titles / games
    // Include StreamUpdates
  */
})
