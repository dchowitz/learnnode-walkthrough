const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter (req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That file type isn\'t allowed.' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
  res.redirect(`/stores/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 3;
  const skip = (page - 1) * limit;

  const [stores, count] = await Promise.all([
    Store.find().sort({ created: 'desc' }).skip(skip).limit(limit),
    Store.count()
  ]);

  const pages = Math.ceil(count / limit);

  if (!stores.length && skip) {
    req.flash('info', `Page ${page} has no results. We redirected you to the last page.`);
    return res.redirect(`/stores/page/${pages}`);
  }

  res.render('stores', { title: 'Stores', stores, count, page, pages });
};

const confirmOwner = (store, user) => {
  if(!store.author.equals(user._id)) {
    throw new Error('You must own a store in order to edit it.');
  }
};

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id });
  confirmOwner(store, req.user);
  res.render('editStore', {
    title: `Edit ${store.name}`,
    store
  });
};

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point';
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true,
    runValidators: true
  }).exec();

  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  if (!store) {
    return next();
  }
  res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const [tags, stores] = await Promise.all([
    Store.getTags(),
    Store.find({ tags: tag || { $exists: true } })
  ]);
  res.render('tags', { tags, tag, stores });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    .find(
      { $text: { $search: req.query.q } },
      { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(5);

  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);

  const stores = await Store.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // meters
      }
    }
  }).select('slug name description location photo').limit(10);

  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(h => h.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  );

  res.json(user);
};

exports.getHeartStores = async (req, res) => {
  const stores = await Store.find({ _id: { $in: req.user.hearts } });
  res.render('stores', { title: 'Your Favourites', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { title: `${stores.length} ★ Top Stores`, stores });
};