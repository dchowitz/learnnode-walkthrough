const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You\'re now logged in.'
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out!');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Oops you must be logged in to do that!');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  // see if user exists (by email)
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // you wouldn't do that on a productive page - an attacker could get info about who is registered or not
    req.flash('error', 'There is no user with that email registered.');
    // rather you would do that
    //req.flash('success', 'A password reset has been emailed to you.');
    return res.redirect('/login');
  }
  // set reset token and expiry on the account
  user.passwordResetToken = crypto.randomBytes(20).toString('hex');
  user.passwordResetExpires = Date.now() + 3600000; // one hour from now
  await user.save();

  // send email with token
  const resetUrl = `http://${req.headers.host}/account/reset/${user.passwordResetToken}`;

  await mail.send({
    user,
    subject: 'Dang-Thats-Delicious: Password Reset',
    resetUrl,
    filename: 'password-reset'
  });

  req.flash('success', `You have been emailed a password reset link.`);

  // redirect to login page
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect('/login');
  }
  res.render('reset', { title: 'Reset Password' });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['confirm-password']) {
    return next();
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    passwordResetToken: req.params.token,
    passwordResetExpires: { $gt: Date.now() }
  });
  if (!user) {
    req.flash('error', 'Password reset token is invalid or has expired.');
    return res.redirect('/login');
  }
  await promisify(user.setPassword, user)(req.body.password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  const updatedUser = await user.save();
  await req.login(updatedUser); // from passport

  req.flash('success', 'Your password has been resetted.');
  res.redirect('/');
};
