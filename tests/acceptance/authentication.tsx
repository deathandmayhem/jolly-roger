import { Accounts } from 'meteor/accounts-base';
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { mount } from 'enzyme';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import './lib';

const USER_EMAIL = 'jolly-roger@deathandmayhem.com';
const USER_PASSWORD = 'password';

Meteor.methods({
  'test.authentication.createUser': function () {
    Accounts.createUser({
      email: USER_EMAIL,
      password: USER_PASSWORD,
    });
  },
});

if (Meteor.isClient) {
  const Routes: typeof import('../../imports/client/components/Routes').default =
    require('../../imports/client/components/Routes').default;

  describe('unauthenticated users', function () {
    it('redirects to the login page', function () {
      const history = createMemoryHistory();
      mount(
        <Router history={history}>
          <Routes />
        </Router>
      );
      assert.equal(history.location.pathname, '/login');

      history.push('/hunts');
      assert.equal(history.location.pathname, '/login');
    });
  });

  describe('authenticated users', function () {
    before(async function () {
      await Meteor.callPromise('test.resetDatabase');
      await Meteor.callPromise('test.authentication.createUser');
      await Meteor.wrapPromise(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
    });

    it('redirects away from the login page', function () {
      const history = createMemoryHistory({ initialEntries: ['/login'] });
      mount(
        <Router history={history}>
          <Routes />
        </Router>
      );
      assert.equal(history.location.pathname, '/hunts');
    });

    it('does not redirect away from an authenticated page', function () {
      const history = createMemoryHistory({ initialEntries: ['/hunts'] });
      mount(
        <Router history={history}>
          <Routes />
        </Router>
      );
      assert.equal(history.location.pathname, '/hunts');
      assert.lengthOf(history.entries, 1);
    });
  });
}
