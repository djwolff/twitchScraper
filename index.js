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
var util = require('util');
const fs = require('fs');

require('dotenv').config();    // for client secrets
const app = express();

app.use(bodyParser.json())

app.get("/webhooks/stream-changed", async (req, res) => {
  // send challenge back for verification
  res.send(req.query['hub.challenge']);

  // recieve hub.challenge
  // console.log("Subscring to stream! -- ", req.query);
  const topic = req.query['hub.topic'];
  // console.log(req.query);
  // now check our subscriptions again to see if are actually subbed

  // TODO: find a way to check for webhooks AFTER everything to reduce # of calls.
  // const found_sub = await lib.webhookSubscribed(topic);
  //
  // if(found_sub) {
  //   console.log('CHALLENGE SUCCESSFUL. saved a new webhook -- ', topic);
  // } else {console.log("Problem with returning challenge OR successfully unsubbed")}
});

app.post("/webhooks/stream-changed", async (req, res) => {
  res.status(200).end(); // Responding is important

  if (req.body["data"].length != 0) {
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
});

const delay = ms => new Promise(res => setTimeout(res, ms));

const delayPromise = (mypromise, mydelay) => {
  return new Promise(function (resolve, reject) {
    setTimeout(function() {
      return resolve(mypromise);
    }, mydelay);
  });
};

async function setupDB() {
  const timerIncrement = 500;
  let delaytime = 0;

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
    // console.log('waiting a bit to not be flagged by twitch hehe');
    // await delay(60000 * 0.5)
  }

  // grab 100 random streamers in each top 5 category if no users exist in our db.
  // db check
  const have_users = (await db.db.query(`select exists (select 1 from streamers)`))[0].exists;
  console.log('do we already have users? -- ', have_users);
  let to_save_users = [];

  if(!have_users) {
    // remove previous webhooks linked to current server.
    var current_hooks = await lib.getWebhooks();
    // console.log(current_hooks);
    delaytime = 0;
    console.log('unsubbing from previous webhooks ~ 2500 seconds');
    const unsubPromises = [];
    [current_hooks[0]].forEach(hook => {
      unsubPromises.push(delayPromise(lib.unsubWebhook(hook.topic.split('=')[1]), delaytime));
      delaytime += (timerIncrement * 10);
    });
    await Promise.all(unsubPromises);
    // console.log('waiting half a min to not be flagged by twitch hehe');
    // await delay(60000 * 0.5)

    // get top 5 categories
    const top5 = await db.db.query(`SELECT * FROM categories ORDER BY viewers*channels DESC LIMIT 5`);
    const top5promises = top5.map(n => lib.getTopStreamsKraken(n.name, 800));

    // get 500 current streams for each category
    const streams = await Promise.all(top5promises);
    var userpromises = []

    console.log('grabbing 500 streamers ~250 seconds');
    var reg = /^[a-z]+$/i; // detect english
    delaytime = 0;
    for (var i = 0; i < 5; i++) {
      const filtered_streams = streams[i].filter(stream => (
        stream.channel.language == 'en' &&
        (stream.channel.partner == true || stream.channel.followers >= 500 || stream.viewers >= 50) &&   // wouldn't it be cool if they became a partner during data collection owo
        reg.test(stream.channel.name)
      ))
      console.log(`filtered streams length for ${top5[i].name}: ${filtered_streams.length}`);
      if (filtered_streams.length < 100) {
        console.log('not a good time to collect :)');
        return [];
      }
      const random_hundred = (helpers.getRandom(filtered_streams, 100)).map(st => st.channel.name);
      userpromises.push(delayPromise(lib.getUsers(random_hundred), delaytime));
      delaytime += timerIncrement;
    }

    var users = await Promise.all(userpromises);

    for (var i = 0; i < users.length; i++) {
      var format_users = users[i].users.map(function(user) {
        return {
          user_id: user._id,
          name: user.name,
          user_created_at: user.created_at,
          user_updated_at: user.updated_at,
          bio: user.bio,
          twitch_type: user.type
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

  if(!have_channels) {

    // grab channels associated to each user and save it.
    console.log('grabbing user channels ~125 seconds');
    var channelsPromise = [];
    delaytime = 0;
    to_save_users.forEach(user => {
      channelsPromise.push(delayPromise(lib.getChannels(user.user_id), delaytime));
      delaytime += timerIncrement / 2;
    });
    var channels = await Promise.all(channelsPromise);
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
    //   console.log('waiting a minute to not be flagged by twitch hehe');
    //   await delay(60000 * 1) // wait 1 minute

    // set up webhooks (steam online and new follower) for each user we are following.
    console.log('subscribing to channel webhooks ~250 seconds');
    var current_hooks = await lib.getWebhooks();
    var hookStreamPromises = [];
    delaytime = 0;
    to_save_users.forEach(user => {
      hookStreamPromises.push(delayPromise(lib.subscribeToUserStream(user, current_hooks), delaytime));
      delaytime += timerIncrement;
    });
    await Promise.all(hookStreamPromises); //fulfill subscriptions
    console.log("finished subscribing to channels");
  }

  const channelnames = to_save_users.map(user => user.name);
  return channelnames;
};

async function addAUser(username, game_id) {
  var customUser = (await lib.getUsers([username])).users[0];
  var query = db.pgp.helpers.insert([{
    user_id: customUser._id,
    name: customUser.name,
    created_at: customUser.created_at,
    updated_at: customUser.updated_at,
    bio: customUser.bio,
    twitch_type: customUser.type,
    game_id: game_id
  }], constants.streamer_columns, 'streamers');
  await db.db.none(query);

  var customChannel = await lib.getChannels(customUser._id);
  var query = db.pgp.helpers.insert([{
    channel_id: customChannel._id,
    username: customChannel.name,
    channel_created_at: customChannel.created_at,
    channel_updated_at: customChannel.updated_at,
    game: customChannel.game,
    followers: customChannel.followers,
    views: customChannel.views,
    status: customChannel.status,
    language: customChannel.broadcaster_language,
    partner: customChannel.partner,
    description: customChannel.description,
    url: customChannel.url,
    mature: customChannel.mature
  }], constants.channel_columns, 'channels');
  await db.db.none(query);

  customUser.user_id = customUser._id;
  var webhooks = await lib.getWebhooks();
  await lib.subscribeToUserStream(customUser, [])
  console.log('adding a user to DB: ', username);
}

app.listen(process.env.PORT, async () => {
  console.log(`Server running on port ${process.env.PORT}`);

  const channels = (await setupDB()).join(',');
  console.log("finished setting up DB!");

  // addAUser('swagg', 512710);

  // job runs every saturday at midnight 0 0 * * 6 ,, every day at midnight 00 00 * * *
  var weeklyUpdate = schedule.scheduleJob('00 00 * * *', async function() {
    console.log("STARTING DAILY CHANNEL / USER UPDATE");

    try {
      var users = (await db.db.query('select * from streamers')).map(user => user.name);
      var segmented = [];
      var seg = []
      for(var i = 0; i < users.length; i++) {
        seg.push(users[i]);
        if(seg.length == 100) {
          segmented.push(seg);
          seg = [];
        }
      }
      var userpromises = segmented.map(seg => lib.getUsers(seg));
      const updated_users = await Promise.all(userpromises);
      to_save_users = [];
      updated_users.forEach(obj => {
        obj.users.forEach(user => {
          to_save_users.push({
            user_id: user._id,
            name: user.name,
            user_created_at: user.created_at,
            user_updated_at: user.updated_at,
            bio: user.bio,
            twitch_type: user.type
          })
        })
      })

      var query = db.pgp.helpers.insert(to_save_users, constants.streamer_columns, 'streamerhistory');
      await db.db.none(query);
      console.log('saved updated streamer info into streamerhistory');

      await db.db.none("DELETE FROM streamers");
      var query = db.pgp.helpers.insert(to_save_users, constants.streamer_columns, 'streamers');
      await db.db.none(query);
      console.log('saved updated streamers!');
    } catch (err) {
      console.log('error on updating users');
      console.log(err);
    }

    try {
      var ids = await db.db.query(`SELECT channel_id FROM channels`);
      // console.log(ids);
      var channelpromise = ids.map(id => lib.getChannels(id.channel_id));
      const all_channels = await Promise.all(channelpromise);
      // console.log(all_channels);
      var to_save_channels = [];
      all_channels.forEach(channel => {
        to_save_channels.push({
          channel_id: parseInt(channel._id),
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
    } catch (err) {
      console.log('error updating channels');
      console.log(err);
    }

    // update webhooks. (unsub and then resub)
    // console.log('resubbing');
    // var currentWebhooks = await lib.getWebhooks();
    // fs.writeFileSync('webhooks.txt', util.inspect(currentWebhooks, { maxArrayLength: null }));
    // var hookStreamPromises = [];
    // let delaytime = 0;
    // const timerIncrement = 500;
    // to_save_channels.forEach(channel => {
    //   // console.log(channel);
    //   channel.user_id = channel.channel_id;
    //   channel.name = channel.username
    //   hookStreamPromises.push(delayPromise(lib.subscribeToUserStream(channel, []), delaytime));
    //   delaytime += timerIncrement;
    // });
    // await Promise.all(hookStreamPromises); //fulfill subscriptions
    // console.log("finished subscribing to channels");

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
  console.log('finished setting up cron updates');

  // start up chatty processes to log chat from live streams.
  const chatty = spawn(`java`, [
    `-jar`, "chatty/Chatty_0.12/Chatty.jar",
    `-channel`, channels,
    `-connect`
  ], {
    detached: true
  });

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
