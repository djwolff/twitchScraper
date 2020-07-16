var mongoose = require('mongoose');
const twitchAPI = require('../helpers/twitchAPI.js');
var Schema = mongoose.Schema;

var CategorySchema = new Schema({
  name                : String,
  twitch_id           : Number,
  giantbomb_id        : Number,
  viewers             : Number,
  channels            : Number,
}, {
  timestamps : { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// determine if users has been populated
CategorySchema.statics.exists = async function () {
  let size = await this.collection.countDocuments();
  return size > 0;
}

// save users (gonna try recursion)
CategorySchema.statics.saveMany = async function (categories) {
  refactored = []

  categories.forEach(cat => {
    refactored.push({
      name: cat.game.name,
      twitch_id: cat.game._id,
      giantbomb_id: cat.game.giantbomb_id,
      viewers: cat.viewers,
      channels: cat.channels
    })
  });
  let saved_categories = await this.insertMany(refactored);
  return saved_categories
}

CategorySchema.statics.getAll = async function () {
  let documents = await Category.find({});
  return documents;
}

const Category = mongoose.model('Category', CategorySchema);

exports.Category = Category;
