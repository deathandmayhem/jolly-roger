import { Accounts } from 'meteor/accounts-base';
import { DDP } from 'meteor/ddp';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { assert } from 'chai';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { act } from 'react-dom/test-utils';
import './lib';
import {
  MemoryRouter,
  Route,
  Location,
  useLocation,
  Routes as ReactRouterRoutes,
  NavigateFunction,
  useNavigate,
} from 'react-router-dom';

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

// waitForSubscriptions and afterFlush both taken from
// https://guide.meteor.com/testing.html#full-app-integration-test

const waitForSubscriptions = () => new Promise<void>((resolve) => {
  const poll = Meteor.setInterval(() => {
    // eslint-disable-next-line no-underscore-dangle
    if (DDP._allSubscriptionsReady()) {
      Meteor.clearInterval(poll);
      resolve();
    }
  }, 200);
});

const afterFlush = () => new Promise<void>((resolve) => {
  Tracker.afterFlush(resolve);
});

const stabilize = async () => {
  await waitForSubscriptions();
  await afterFlush();
};

if (Meteor.isClient) {
  const Routes: typeof import('../../imports/client/components/Routes').default =
    require('../../imports/client/components/Routes').default;

  let container: HTMLDivElement | null = null;
  const location: React.MutableRefObject<Location | null> = { current: null };
  const navigate: React.MutableRefObject<NavigateFunction | null> = { current: null };

  const LocationCapture = () => {
    location.current = useLocation();
    navigate.current = useNavigate();
    return null;
  };

  const TestApp = () => {
    return (
      <MemoryRouter>
        <Routes />
        <ReactRouterRoutes>
          <Route path="*" element={<LocationCapture />} />
        </ReactRouterRoutes>
      </MemoryRouter>
    );
  };

  describe('authentication', function () {
    beforeEach(function () {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(function () {
      if (container) {
        unmountComponentAtNode(container);
        container.remove();
        container = null;
      }
      location.current = null;
      navigate.current = null;
    });

    describe('no users', function () {
      before(async function () {
        await Meteor.callPromise('test.resetDatabase');
      });

      it('redirects to the create-first-user page', async function () {
        await act(async () => {
          render(<TestApp />, container);
          await stabilize();
        });
        assert.equal(location.current?.pathname, '/create-first-user');
      });
    });

    describe('has users but not logged in', function () {
      before(async function () {
        await Meteor.callPromise('test.resetDatabase');
        await Meteor.callPromise('test.authentication.createUser');
      });

      it('redirects to the login page', async function () {
        await act(async () => {
          render(<TestApp />, container);
          await stabilize();
        });
        assert.equal(location.current?.pathname, '/login', 'redirects to login from root');

        // Attempt to go to a specific authenticated page
        await act(async () => {
          navigate.current?.('/hunts');
          await stabilize();
        });
        assert.equal(location.current?.pathname, '/login', 'redirects to login from authenticated page');
      });
    });

    describe('authenticated users', function () {
      before(async function () {
        await Meteor.callPromise('test.resetDatabase');
        await Meteor.callPromise('test.authentication.createUser');
        await Meteor.wrapPromise(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      });

      it('redirects away from the login page', async function () {
        await act(async () => {
          render(<TestApp />, container);
          await stabilize();
          navigate.current?.('/login');
          await stabilize();
        });
        assert.equal(location.current?.pathname, '/hunts');
      });

      it('does not redirect away from an authenticated page', async function () {
        await act(async () => {
          render(<TestApp />, container);
          await stabilize();
          navigate.current?.('/hunts');
          await stabilize();
        });
        assert.equal(location.current?.pathname, '/hunts');
      });
    });
  });
}
