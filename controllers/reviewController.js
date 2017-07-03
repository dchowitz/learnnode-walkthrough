const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  const review = new Review({
    author: req.user._id,
    store: req.params.id,
    text: req.body.text,
    rating: req.body.rating
  });
  await review.save();
  req.flash('success', 'Review saved!');
  res.redirect('back');
};