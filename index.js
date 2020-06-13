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

app.post("/hook", (req, res) => {
  console.log(req.body) // Call your action on the request here
  res.status(200).end() // Responding is important
})

// job runs every saturday at midnight
// var j = schedule.scheduleJob('0 0 * * 6', function() {
//   channels = lib.getChannels(20);
//   /* every week we want:
//     1. top 20 streamers (we will only follow these)
//     2. for each streamer -> record # of followers
//     3. for each streamer -> record # of subs
//     4. for each streamer -> record total chat count on streams
//     5. for each streamer -> record # of donations
//     6. for each streamer -> record total amount of views on streams
//     7. for each streamer -> record type of streams / titles / games
//   */
// })
function main() {
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
  .then(async (user_ids) => {
    // SAVE USERS AND RECORD CHANGES
  })
  .catch(err => console.log(err));
}

main()

// Start express on the defined port
db_fn.connectDb().then(async () => {
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`))
})
