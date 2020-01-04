import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/nicolaslopezj:roles';
import express from 'express';
import Profiles from '../../../lib/models/profiles';
import { ProfileType } from '../../../lib/schemas/profiles';

// eslint-disable-next-line new-cap
const router = express.Router();

function findUserByEmail(email: string): { user: Meteor.User | null, profile: ProfileType | null } {
  // We have two ways of finding a user: either by the email address
  // they registered with, or by the Google account they've
  // linked. Try both.

  const profile = Profiles.findOne({ googleAccount: email });
  if (profile) {
    return { profile, user: Meteor.users.findOne(profile._id) };
  }

  const user = <Meteor.User>Accounts.findUserByEmail(email);
  if (!user) {
    return { user: null, profile: null };
  }

  return { user, profile: Profiles.findOne(user._id) };
}

// You are active if you've logged in in the last year
const ACTIVE_THRESHOLD = 365 * 24 * 60 * 60 * 1000;

const renderUser = function renderUser(user: Meteor.User, profile: ProfileType) {
  const active = user.lastLogin &&
          Date.now() - user.lastLogin.getTime() < ACTIVE_THRESHOLD;

  return {
    _id: user._id,
    primaryEmail: user.emails && user.emails[0].address,
    googleAccount: profile.googleAccount,
    active,
    operator: Roles.userHasPermission(user._id, 'users.makeOperator'),
  };
};

router.get('/:email', (req, res) => {
  check(req.params.email, String);

  const { user, profile } = findUserByEmail(req.params.email);
  if (!user || !profile) {
    res.sendStatus(404);
    return;
  }

  res.json(renderUser(user, profile));
});

export default router;
