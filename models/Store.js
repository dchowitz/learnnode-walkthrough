const mongoose = require('mongoose');
const slug = require('slugs');

mongoose.Promise = global.Promise;

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!'
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: {
    type: String
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author.'
  }
}, {
  toJSON: { virtuals: true },
  toOjbect: { virtuals: true },
});

storeSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'store'
});

function autoPopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    return next();
  }
  this.slug = slug(this.name);

  // ensure unique slugs across all stores
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*)?)$`, 'i');
  const storesWithSlug = await this.constructor.count({ slug: slugRegEx });
  if (storesWithSlug > 0) {
    this.slug = `${this.slug}-${storesWithSlug + 1}`;
  }

  next();
});

storeSchema.statics.getTags = function() {
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } }},
    { $sort: { count: -1 } }
    // { $sortByCount: '$tags' } // since mongodb v3.4
  ]);
};

storeSchema.statics.getTopStores = function () {
  return this.aggregate([
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews'
      }
    },
    { $match: { 'reviews.1': { $exists: true } } }, // reviews.length > 1
    {
      $project: {
        _id: 1,
        name: 1,
        slug: 1,
        photo: 1,
        reviewCount: { $size: '$reviews' },
        reviewAvg: { $avg: '$reviews.rating' }
      }
    },
    //{ $match: { reviewCount: { $gt: 1 } } },
    { $sort: { reviewAvg: -1 } },
    { $limit: 10 }
  ]);
};

module.exports = mongoose.model('Store', storeSchema);