const mongoose = require('mongoose');
const md5 = require('md5');
const validator = require('validator');
const mongoDbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

mongoose.Promise = global.Promise;

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please supply an email address!'
  },
  name: {
    type: String,
    trim: true,
    required: 'Please supply a name!'
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  hearts: [
    { type: mongoose.Schema.ObjectId, ref: 'Store' }
  ]
});

userSchema.virtual('gravatar').get(function () {
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongoDbErrorHandler);

module.exports = mongoose.model('User', userSchema);