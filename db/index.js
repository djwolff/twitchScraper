const pgp = require('pg-promise')({
   capSQL: true // if you want all generated SQL capitalized
});
require('dotenv').config();
const constants = require('./../helpers/constants.js');
const lib = require('./../helpers/twitchAPI.js');

const cn = {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: process.env.PGMAX
}

const db = pgp(cn);

// function checkProperties(obj) {
//     for (var key in obj) {
//         if (obj[key] !== null && obj[key] != "")
//             return false;
//     }
//     return true;
// }

async function saveStream(stream) {
  var now = new Date();
  console.log(`saving ${stream.user_name}'s stream with viewercount = ${stream.viewer_count} at time: ${now.toLocaleString()}`);

  var query = pgp.helpers.insert({
    stream_id: stream.id,
    username: stream.user_name,
    user_id: stream.user_id,
    game_id: stream.game_id,
    started_at: stream.started_at,
    tag_ids: stream.tag_ids,
    title: stream.title,
    type: stream.type,
    language: stream.language,
    viewer_count: stream.viewer_count,
  }, constants.stream_columns, 'streams');

  await db.none(query);
}

async function followStream(username) {
  let ms_stream = await lib.getStream(username);
  if (!ms_stream) {return}
  // console.log(ms_stream);
  let data = ms_stream.data;

  // TODO: TEST WHEN STREAM CHANGES (name, whatever )
  if(data.length == 0) {
    var now = new Date();
    console.log(`${username}'s stream ended at ${now.toLocaleString()}`);
    return
  }
  // save stream
  try {
    await saveStream(data[0]);
  } catch (err) {
    console.log('tried to save, but probably malformed data from twitch');
  }

  setTimeout(followStream, 60 * 1000 * 10, username); // call again in 5 minutes
}


module.exports = {
  pgp: pgp,
  db: db,
  saveStream: saveStream,
  followStream: followStream
}
