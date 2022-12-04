import { Accounts } from 'meteor/accounts-base';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import express from 'express';
import MeteorUsers from '../../../lib/models/MeteorUsers';

// eslint-disable-next-line new-cap
const users = express.Router();

function findUserByEmail(email: string): Meteor.User | undefined {
  // We have two ways of finding a user: either by the email address
  // they registered with, or by the Google account they've
  // linked. Try both.

  return Accounts.findUserByEmail(email) ||
    MeteorUsers.findOne({ googleAccount: email });
}

// You are active if you've logged in in the last year
const ACTIVE_THRESHOLD = 365 * 24 * 60 * 60 * 1000;

const renderUser = function renderUser(user: Meteor.User) {
  const active = user.lastLogin &&
          Date.now() - user.lastLogin.getTime() < ACTIVE_THRESHOLD;

  return {
    _id: user._id,
    primaryEmail: user.emails?.[0]?.address,
    googleAccount: user.googleAccount,
    active,
  };
};

users.get('/:email', (req, res) => {
  check(req.params.email, String);

  const user = findUserByEmail(req.params.email);
  if (!user) {
    res.sendStatus(404);
    return;
  }

  res.json(renderUser(user));
});

export default users;
