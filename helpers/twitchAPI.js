const request = require('request-promise');
require('dotenv').config();

var _url = (type, path) => {
    // type = helix -> oauth = bearer
    // type = kraken -> oauth = OAuth
    return {
      'url': `https://api.twitch.tv/${type}/${path}`,
      'headers': {
        'Content-Type': 'application/json',
        'Client-ID': process.env.CLIENT_ID,
        'Accept': (type == "kraken") ? 'application/vnd.twitchtv.v5+json' : "",
        'Authorization': ((type == "kraken") ? 'OAuth ' : 'Bearer ')+ process.env.OAUTH
      }
    }
  }

var _webhook = (callback, mode, topic, lease, secret='') => {
  //
  return {
    'method': 'POST',
    'url': 'https://api.twitch.tv/helix/webhooks/hub',
    'headers': {
      'Content-Type': 'application/json',
      'Client-ID': process.env.CLIENT_ID,
      'Authorization': 'Bearer ' + process.env.OAUTH
    },
    'body': JSON.stringify({
      'hub.callback': process.env.BASE_URL + callback,
      'hub.mode': mode,
      'hub.topic': topic,
      'hub.lease_seconds': lease,
      // 'hub.secret'
    })
  }
}

async function run_request(req) {
  return await request(req, function(err, resp, body) {
    if (!err && resp.statusCode == 200) {
      // console.log(JSON.stringify(JSON.parse(body), null, 2));
      return body;
    }
  })
  .then(body => {
    if(body) return JSON.parse(body);
  })
  .catch(err => console.log(err))
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getAllStreams(game_id, streams = [], p = '') {
  var req = _url("helix", `streams?game_id=${game_id}&first=100&after=${p}`);

  var all = await run_request(req);
  streams = [...streams, ...all.data]
  if(all.pagination == {} || !all.pagination.cursor) {
    console.log(`finished pulling ${game_id}`);
    return streams
  }
  return await getAllStreams(game_id, streams, all.pagination.cursor)
}

async function getChannels(userid) {
  var req = _url("kraken", `channels/${userid}`);
  return await run_request(req);
}

async function getUsers(usernames) {
  var req = _url("kraken", `users?login=${usernames.join(',')}`);
  return await run_request(req);
}

async function getAllCategories(cats = [], done = false) {
  if (done) return cats;
  var req = _url("kraken", `games/top?limit=100&offset=${Math.max(0, cats.length-1)}`);
  var new_cats = (await run_request(req)).top;
  return await getAllCategories([...cats, ...new_cats], (new_cats.length < 2) ? true : false)
}

async function getAppTokenWebhooks() {
  let flow = [
    `client_id=${process.env.CLIENT_ID}`,
    `client_secret=${process.env.CLIENT_SECRET}`,
    `grant_type=client_credentials`
  ].join("&");

  var req = {
    'method': 'POST',
    'url': 'https://id.twitch.tv/oauth2/token?' + flow,
    'headers': {'Content-Type': 'application/json'}
  }

  return await run_request(req);
}

async function getAppTokenScopes(scopes) {
  let flow = [
    `client_id=${process.env.CLIENT_ID}`,
    `client_secret=${process.env.CLIENT_SECRET}`,
    `grant_type=client_credentials`,
    `scope=${scopes}`
  ].join("&");

  var req = {
    'method': 'POST',
    'url': 'https://id.twitch.tv/oauth2/token?' + flow,
    'headers': {'Content-Type': 'application/json'}
  }

  return await run_request(req);
}

async function getWebhooks(auth = '', webhooks = [], p = '') {
  // first need to get app token from twitch
  const req = _url("helix", `webhooks/subscriptions?first=100&after=${p}`);
  if(auth == '') auth = "Bearer " + (await getAppTokenWebhooks()).access_token;

  req.headers.Authorization = auth;
  const all = await run_request(req);

  webhooks = [...webhooks, ...all.data];
  if(all.pagination == {} || !all.pagination.cursor) {
    console.log(`finished pulling all webhooks`);
    return webhooks
  }
  return await getWebhooks(auth, webhooks, all.pagination.cursor);
}

async function subscribeToUserStream(user, subs) {
  // check to see if already subscribed to stream events:
  // check if we are already subscribed:
  const user_id = user.user_id
  var found = undefined;
  subs.forEach(sub => {
    if (sub.topic.includes(user_id)) {found = sub}
  });

  if (!found) {
    // use ngrok to simulate server webhook
    const req = _webhook(
      `/webhooks/stream-changed`,
      'subscribe',
      `https://api.twitch.tv/helix/streams?user_id=${user_id}`,
      864000);
    return await run_request(req);
  } else {
    console.log(`already actively subscribed to ${user.name}'s stream and expires at ${found.expires_at}`);
  }
}

async function getStream(user_name) {
  var req = _url("helix", `streams?user_login=${user_name}`);
  // console.log("request: ", req);
  return await run_request(req)
}

async function getFollowers(channel_id, followers = [], p = '') {
  const req = _url("kraken", `channels/${channel_id}/follows?limit=100${(p != '') ? `&cursor=${p}` : ''}`);
  const all = await run_request(req);

  followers = [...followers, ...all.follows];
  if(!all._cursor || all._cursor == {} || all._cursor == '') {
    console.log(`finished pulling all followers for ${channel_id} -- wait 1 min for cooldown`);
    await delay(60000);
    return followers
  }
  return await getFollowers(channel_id, followers, all._cursor)
}


exports.getAllCategories = getAllCategories;
exports.getAllStreams = getAllStreams;
exports.getChannels = getChannels;
exports.getUsers = getUsers;
exports.subscribeToUserStream = subscribeToUserStream;
exports.getWebhooks = getWebhooks;
exports.getStream = getStream;
exports.getFollowers = getFollowers;
