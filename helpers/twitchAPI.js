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

async function getChannels(count) {
  req = _url("kraken", `search/channels?query=""&limit=${count}`);

  return await request(req, function(err, resp, body) {
    if (!err && resp.statusCode == 200) {
      // console.log(JSON.stringify(JSON.parse(body), null, 2));
      return body;
    } else {
      throw "error fetching top channels";
    }
  }).then(body => { return JSON.parse(body)})
}

exports.getChannels = getChannels;
// exports.getFollowers = getFollowers;
