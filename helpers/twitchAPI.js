const request = require('request-promise');
require('dotenv').config();

var _url = (type, path) => {
    // type = helix -> oauth = bearer
    // type = kraken -> oauth = OAuth
    return {
      'url': `https://api.twitch.tv/${type}/${path}` + ((type == "kraken") ? "&api_version=5" : ""),
      'headers': {
        'Content-Type': 'application/json',
        'Client-ID': process.env.CLIENT_ID,
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
      'hub.callback': callback,
      'hub.mode': mode,
      'hub.topic': topic,
      'hub.lease_seconds': lease,
      // 'hub.secret'
    })
  }
}

async function getChannels(count) {
  var req = _url("kraken", `search/channels?query=""&limit=${count}`);

  return await request(req, function(err, resp, body) {
    if (!err && resp.statusCode == 200) {
      // console.log(JSON.stringify(JSON.parse(body), null, 2));
      return body;
    }
  })
  .then(body => { return JSON.parse(body)})
  .catch(err => console.log(err))
}

async function getUsers(usernames) {
  var req = _url("kraken", `users?login=${usernames.join()}`);

  return await request(req, function(err, resp, body) {
    if (!err && resp.statusCode == 200) {
      // console.log(JSON.stringify(JSON.parse(body), null, 2));
      return body;
    }
  })
  .then(body => { return JSON.parse(body)})
  .catch(err => console.log(err))
}

async function subscribeToUserStream(username) {
  // first find user_id:
  var user = (await getUsers([username])).users[0];
  var user_id = user._id
  // console.log(user);

  // use ngrok to simulate server webhook
  var req = _webhook(
    'http://4443c7b9d62c.ngrok.io/webhooks/stream-changed',
    'subscribe',
    `https://api.twitch.tv/helix/streams?user_id=${user_id}`,
    864000);
  // console.log(req);
  return await request(req, function(err, resp, body) {
    if (!err && resp.statusCode == 200) {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
      return body;
    }
  })
  .then(body => { return body})
  .catch(err => console.log(err))
}

async function getAppToken() {
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

  return await request(req, function(err, resp, body) {
    if (!err && resp.statusCode == 200) {
      // console.log(JSON.stringify(JSON.parse(body), null, 2));
      return body;
    }
  })
  .then(body => { return JSON.parse(body)})
  .catch(err => console.log(err))
}

async function getWebhooks() {
  // first need to get app token from twitch
  var app_token = (await getAppToken()).access_token;
  var req = _url("helix", `webhooks/subscriptions`);
  req.headers.Authorization = "Bearer " + app_token;

  return await request(req, function(err, resp, body) {
    if (!err && resp.statusCode == 200) {
      // console.log(JSON.stringify(JSON.parse(body), null, 2));
      return body;
    }
  })
  .then(body => { return JSON.parse(body)})
  .catch(err => console.log(err))
}

exports.getChannels = getChannels;
exports.getUsers = getUsers;
exports.subscribeToUserStream = subscribeToUserStream;
exports.getWebhooks = getWebhooks;
// exports.getFollowers = getFollowers;
