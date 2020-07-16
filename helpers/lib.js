const twitchAPI = require('./twitchAPI.js');
const db_fn = require('../models/index.js');
var schedule = require('node-schedule');


async function casestudy(username) {
  await db_fn.models.Stream.followStream(username);
}

async function setupDB() {
  var games = await twitchAPI.getTopGames(5)    // get top 5 categories

  WAIT WHAT IF WE JUST GOT ALL THE CHANNELS, USERS, AND SHIZZZ YOO AND THEN QUERY THAT SHIT YOOOO
  // // save categories
  // const category_exists = await db_fn.models.Channel.exists();
  // if (!category_exists) {
  //   const saved_categories = await db_fn.models.Category.saveMany(games.top);
  // }
  //
  // const game_names = games.top.map(game => game.game.name);
  // // grab top 50 channels per category
  // var channels = []
  //
  // game_names.forEach(name => {
  //   channels.push(twitchAPI.getChannels(20, encodeURI(name)));
  // });
  //
  // // fulfill promises on getchannels for all categories
  // var pchannels = await Promise.all(channels);
  // console.log(pchannels);
  // var allChannels = []
  // pchannels.forEach(category => {
  //   category.data.forEach(channel => {
  //     console.log(channel.id, channel.display_name);
  //     channels.push(twitchAPI.getChannelByID(channel.id))
  //   })
  // })

  // console.log(allChannels);
  // fulfill promises on getChannelByID for each channel
  // var pAllChannels = await Promise.all(allChannels);
  // console.log(pAllChannels);

  // console.log(channelsKraken[2].channels);

  // twitchAPI.getChannels(20)
  // .then(async (channels) => {
  //   // console.log(JSON.stringify(channels.channels, null, 2));
  //   // GRAB TOP 20 STREAMERS (channels)
  //   const channel_exists = await db_fn.models.Channel.exists();
  //   if (!channel_exists) {
  //     const saved_channels = await db_fn.models.Channel.saveMany(channels.channels);
  //     console.log("saved channels!");
  //   }
  //
  //   users = await db_fn.models.Channel.getUsers(); // return user ids
  //   return users
  // })
  // .then(async (usernames) => {
  //   // SAVE USERS AND RECORD CHANGES
  //   const users_exists = await db_fn.models.User.exists();
  //   if (!users_exists) {
  //     const saved_users = await db_fn.models.User.saveMany(usernames);
  //     console.log("saved users!");
  //   }
  // })
  // .catch(err => console.log(err));
}

// job runs every saturday at midnight
var weeklyJob = schedule.scheduleJob('0 0 * * 6', function() {
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


exports.casestudy = casestudy;
exports.setupDB = setupDB;
exports.weeklyJob = weeklyJob;
