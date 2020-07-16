const express = require("express");
const bodyParser = require("body-parser");
const request = require('request-promise');
var schedule = require('node-schedule');
const { spawn } = require("child_process")

const lib = require('./helpers/twitchAPI.js');
const helpers = require('./helpers/helperFunctions.js');
const constants = require('./helpers/constants.js');
const db = require('./db/index.js')
const editDotenv = require('edit-dotenv');

require('dotenv').config();    // for client secrets
const app = express();

app.use(bodyParser.json())

app.get("/webhooks/stream-changed", async (req, res) => {
  // send challenge back for verification
  res.send(req.query['hub.challenge']);

  // recieve hub.challenge
  // console.log("Subscring to stream! -- ", req.query);
  const topic = req.query['hub.topic'];

  // now check our subscriptions again to see if are actually subbed
  const subs = await lib.getWebhooks();

  var found_sub = undefined;
  for(let i = 0; i < subs.length; i++) {
    if (subs[i].topic == topic) {
      found_sub = {
        topic: subs[i].topic,
        callback: subs[i].callback,
        expires_at: subs[i].expires_at
      }
    }
  }
  if(found_sub) {
    const query = db.pgp.helpers.insert(found_sub, constants.webhook_columns, 'webhooks')
    await db.db.none(query);
    console.log('CHALLENGE SUCCESSFUL. saved a new webhook -- ', found_sub.topic, 'that expires at', found_sub.expires_at);
  } else {console.log("Problem with returning challenge OR successfully unsubbed")}
})

app.post("/webhooks/stream-changed", async (req, res) => {

  if (req.body["data"].length == 0) {
    console.log('Stream has ended');
  } else {
    // console.log("Stream has been updated --", req.body.data);
    // TODO: Save in streams table every time it changes
    // var stream = await fn.models.Stream.save(req.body.data)
    // await db.saveStream(req.body.data[0]);

    // TODO: start following this stream every minute w/ setTimeout
    // db_fn.models.Stream.followStreamWebhook(req.body["data"][0]);
    db.followStream(req.body.data[0].user_name);

    // TODO: start saving messages table with streams_id with preference on bigger streamers
    // run chatty sequence here.
  };
  res.status(200).end(); // Responding is important
})

const delay = ms => new Promise(res => setTimeout(res, ms));

async function setupDB() {
  // get all categories if not already in db.
  const have_categories = (await db.db.query(`select exists (select 1 from categories)`))[0].exists;
  console.log('do we already have categories? -- ', have_categories);

  if(!have_categories) {
  var categories = await lib.getTopCategories(20);
  console.log("finished getting", categories.length, "categories (games)");
    var to_save_categories = categories.map(function(game) {
        return {
          game_id: game.game._id,
          channels: game.channels,
          viewers: game.viewers,
          name: game.game.name
        }
    })
    var query = db.pgp.helpers.insert(to_save_categories, constants.category_columns, 'categories');
    await db.db.none(query);
    console.log('saved new categories');
    console.log('waiting a minute to not be flagged by twitch hehe');
    await delay(60000 * 1) // wait 1 minute
  }

  // grab 100 random streamers in each top 5 category if no users exist in our db.
  // db check
  const have_users = (await db.db.query(`select exists (select 1 from streamers)`))[0].exists;
  console.log('do we already have users? -- ', have_users);
  let to_save_users = [];

  if(!have_users) {
    // get top 5 categories
    const top5 = await db.db.query(`SELECT name FROM categories ORDER BY channels DESC LIMIT 5`);
    const top5promises = top5.map(n => lib.getTop500StreamsKraken(n.name));

    // get 500 current streams for each category
    const streams = await Promise.all(top5promises);
    var followingpromises = []

    var reg = /^[a-z]+$/i; // detect english
    for (var i = 0; i < 5; i++) {
      const filtered_streams = streams[i].filter(stream => (
        stream.channel.language == 'en' &&
        (stream.channel.partner == true || stream.channel.followers >= 700 || stream.viewers >= 300)    // wouldn't it be cool if they became a partner during data collection owo
        reg.test(stream.channel.name)
      ))
      console.log(`filtered streams length for ${top5[i].name}: ${filtered_streams.length}`);
      const random_hundred = (helpers.getRandom(filtered_streams, 100)).map(st => st.channel.name);
      followingpromises.push(lib.getUsers(random_hundred));
    }

    const users = await Promise.all(followingpromises);
    for (var i = 0; i < 5; i++) {
      var format_users = users[i].users.map(function(user) {
        return {
          user_id: user._id,
          name: user.name,
          created_at: user.created_at,
          updated_at: user.updated_at,
          bio: user.bio,
          twitch_type: user.type,
          game_id: top5[i].game_id
        }
      })
      to_save_users = [...to_save_users, ...format_users]
    }
    var query = db.pgp.helpers.insert(to_save_users, constants.streamer_columns, 'streamers');
    await db.db.none(query);
    console.log('saved new users');
    console.log('waiting a minute to not be flagged by twitch hehe');
    await delay(60000 * 1) // wait 1 minute
  } else {
    to_save_users = await db.db.query(`SELECT * FROM streamers`);
    console.log('pre-loading users');
  }


  const have_channels = (await db.db.query(`select exists (select 1 from channels)`))[0].exists;
  console.log('do we already have channels? -- ', have_channels);

  const current_hooks = await lib.getWebhooks();

  if(!have_channels) {

    // remove previous webhooks linked to current server.
    console.log('unsubbing from previous webhooks');
    const unsubPromises = current_hooks.map(hook => lib.unsubWebhook(hook.topic.split('=')[1]));
    await Promise.all(unsubPromises);
    console.log('waiting a minute to not be flagged by twitch hehe');
    await delay(60000 * 1) // wait 1 minute

    // grab channels associated to each user and save it.
    var useridpromise = to_save_users.map(user => lib.getChannels(user.user_id));
    const channels = await Promise.all(useridpromise);
    var to_save_channels = [];
    channels.forEach(channel => {
      to_save_channels.push({
        channel_id: channel._id,
        username: channel.name,
        channel_created_at: channel.created_at,
        channel_updated_at: channel.updated_at,
        game: channel.game,
        followers: channel.followers,
        views: channel.views,
        status: channel.status,
        language: channel.broadcaster_language,
        partner: channel.partner,
        description: channel.description,
        url: channel.url,
        mature: channel.mature
      })
    });

    var query = db.pgp.helpers.insert(to_save_channels, constants.channel_columns, 'channels');
    await db.db.none(query);
    console.log('saved new channels!');
    console.log('waiting a minute to not be flagged by twitch hehe');
    await delay(60000 * 1) // wait 1 minute
  }

  // set up webhooks (steam online and new follower) for each user we are following.
  var hookStreamPromises = to_save_users.map(user => lib.subscribeToUserStream(user, current_hooks));
  await Promise.all(hookStreamPromises); //fulfill subscriptions
  console.log("finished subscribing to channels");

  // save channels' followers
  // can't get subscribers due to privacy.
  // const followerPromises = [to_save_users[0]].map(user => lib.getFollowers(user.user_id));
  // const channelFollowers = await Promise.all(followerPromises);
  //
  // console.log(channelFollowers);
  // var to_save_followers = []
  // channelFollowers.forEach((followers, i) => {
  //   followers.forEach(follower => {
  //     to_save_followers.push({
  //       created_at: follower.created_at,
  //       channel_id: to_save_users[i].user_id, // user_id is the same as channel id
  //       user_id: follower.user._id,
  //       user_name: follower.user.name,
  //       user_created_at: follower.user.created_at,
  //       user_updated_at: follower.user.updated_at,
  //       user_type: follower.user.type,
  //       notifications: follower.notifications
  //     })
  //   })
  // });
  //
  // var query = db.pgp.helpers.insert(to_save_followers, constants.follow_columns, 'follows')
  // await db.db.none(query);
  // console.log('saved follows for all channels!');

  const channels = to_save_users.map(user => user.name);
  return channels;
};

app.listen(process.env.PORT, async () => {
  console.log(`Server running on port ${process.env.PORT}`);

  const channels = (await setupDB()).join(',');
  console.log("finished setting up DB!");

  // job runs every saturday at midnight 0 0 * * 6 ,, currently every day at midnight
  var weeklyUpdate = schedule.scheduleJob('00 00 * * *', async function() {
    console.log("updating channels");

    const have_channels = (await db.db.query(`select exists (select 1 from channels)`))[0].exists;
    console.log('do we have channels? -- ', have_channels);

    if(have_channels) {
      var ids = await db.db.query(`SELECT twitch_channel_id FROM channels`);
      var channelpromise = ids.map(id => lib.getChannels(id.twitch_channel_id));
      const all_channels = await Promise.all(channelpromise);
      var to_save_channels = [];
      all_channels.forEach(channel => {
        to_save_channels.push({
          twitch_channel_id: parseInt(channel._id),
          username: channel.name,
          channel_created_at: channel.created_at,
          channel_updated_at: channel.updated_at,
          game: channel.game,
          followers: parseInt(channel.followers),
          views: parseInt(channel.views),
          status: channel.status,
          language: channel.broadcaster_language,
          partner: channel.partner,
          description: channel.description,
          url: channel.url,
          mature: channel.mature
        })
      });
      // console.log(to_save_channels);
      // save into channel history
      var query = db.pgp.helpers.insert(to_save_channels, constants.channel_columns, 'channelhistory');
      await db.db.none(query);
      console.log('saved updated channels info into channelhistory');

      // save / update channels
      // const cs = new db.pgp.helpers.ColumnSet(constants.channel_columns, {table: 'channels'});
      // const update = db.pgp.helpers.update(to_save_channels, cs) + ' WHERE v.twitch_channel_id = t.twitch_channel_id';
      // await db.db.none(update);
      // console.log('updated channels');
      await db.db.none("DELETE FROM channels");
      var query = db.pgp.helpers.insert(to_save_channels, constants.channel_columns, 'channels');
      await db.db.none(query);
      console.log('saved updated channels!');
    }

    // updating channel followings
    // const followerPromises = [to_save_users[0]].map(user => lib.getFollowers(user.user_id));
    // const channelFollowers = await Promise.all(followerPromises);
    //
    // console.log(channelFollowers);
    // var to_save_followers = []
    // channelFollowers.forEach((followers, i) => {
    //   followers.forEach(follower => {
    //     to_save_followers.push({
    //       created_at: follower.created_at,
    //       channel_id: to_save_users[i].user_id, // user_id is the same as channel id
    //       user_id: follower.user._id,
    //       user_name: follower.user.name,
    //       user_created_at: follower.user.created_at,
    //       user_updated_at: follower.user.updated_at,
    //       user_type: follower.user.type,
    //       notifications: follower.notifications
    //     })
    //   })
    // });
    // await db.db.none("DELETE FROM follows");
    // var query = db.pgp.helpers.insert(to_save_followers, constants.follow_columns, 'follows')
    // await db.db.none(query);
    // console.log('saved updated channel follows!');
  });
  console.log('finished setting up weekly updates');

  // start up chatty processes to log chat from live streams.
  const chatty = spawn(`java`, [
    `-jar`, "./chatty/Chatty_0.12/Chatty.jar",
    `-channel`, channels,
    `-d`, `chatty/settings`,
    `-single`,
    `-connect`
    ]);

    chatty.stdout.on("data", data => {
        // console.log(`stdout: ${data}`);
        return;
    });

    chatty.stderr.on("data", data => {
        // console.log(`stderr: ${data}`);
        return;
    });

    chatty.on('error', (error) => {
        console.log(`error: ${error.message}`);
    });

    chatty.on("close", code => {
        console.log(`child process exited with code ${code}`);
    });
});
