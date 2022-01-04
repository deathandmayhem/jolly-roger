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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function conditionTrueByTimeout(conditionFunc: () => boolean, timeoutMsec: number) {
  const startTime = Date.now();
  while (Date.now() < startTime + timeoutMsec) {
    if (conditionFunc()) {
      return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await sleep(5);
  }
  return false;
}

if (Meteor.isClient) {
  const Routes: typeof import('../../imports/client/components/Routes').default =
    require('../../imports/client/components/Routes').default;

  describe('no users', function () {
    before(async function () {
      await Meteor.callPromise('test.resetDatabase');
    });

    it('redirects to the create-first-user page', async function () {
      this.timeout(2000);
      const history = createMemoryHistory();
      mount(
        <Router history={history}>
          <Routes />
        </Router>
      );

      // Give some time for the RootRedirector's hasUsers sub to complete
      assert.isTrue(await conditionTrueByTimeout(() => {
        return history.location.pathname === '/create-first-user';
      }, 2000), 'got redirected to /create-first-user');
    });
  });

  describe('has users but not logged in', function () {
    before(async function () {
      await Meteor.callPromise('test.resetDatabase');
      await Meteor.callPromise('test.authentication.createUser');
    });

    it('redirects to the login page', async function () {
      this.timeout(4000);
      const history = createMemoryHistory();
      mount(
        <Router history={history}>
          <Routes />
        </Router>
      );
      // Give some time for the RootRedirector's hasUsers sub to complete
      assert.isTrue(await conditionTrueByTimeout(() => {
        return history.location.pathname === '/login';
      }, 2000), 'got redirected to /login');

      history.push('/hunts');
      assert.isTrue(await conditionTrueByTimeout(() => {
        return history.location.pathname === '/login';
      }, 2000), 'got re-redirected to /login');
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
