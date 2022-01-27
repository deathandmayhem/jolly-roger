/* eslint-disable no-console */
import { Meteor } from 'meteor/meteor';
import { act, render } from '@testing-library/react';
import React from 'react';
import {
  Location,
  MemoryRouter,
  NavigateFunction,
  Route,
  RouteObject,
  Routes as ReactRouterRoutes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import fixtures from '../../imports/fixtures';
import { GLOBAL_SCOPE } from '../../imports/lib/is-admin';
import { stabilize, USER_EMAIL, USER_PASSWORD } from './lib';

function enumeratePaths(routes: RouteObject[], prefix: string = '', acc: string[] = []): string[] {
  routes.forEach((route) => {
    if (route.children) {
      enumeratePaths(route.children, `${prefix}${route.path}/`, acc);
    }
    acc.push(`${prefix}${route.path}`);
  });
  return acc;
}

if (Meteor.isClient) {
  const Routes: typeof import('../../imports/client/components/Routes').default =
    require('../../imports/client/components/Routes').default;
  const { AuthenticatedRouteList, UnauthenticatedRouteList }: typeof import('../../imports/client/components/Routes') =
    require('../../imports/client/components/Routes');

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

  const fixtureHunt = Object.keys(fixtures)[0];
  const fixturePuzzle = fixtures[fixtureHunt].puzzles[0]._id;

  describe('routes', function () {
    before(async function () {
      await Meteor.callPromise('test.resetDatabase');
      await Meteor.callPromise('test.authentication.createUser');
      await Meteor.wrapPromise(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      await Meteor.callPromise('test.authentication.addRole', GLOBAL_SCOPE, 'admin');
      await Meteor.callPromise('createFixtureHunt');
      await Meteor.callPromise('addToHunt', fixtureHunt, USER_EMAIL);
      await Meteor.callPromise('test.authentication.addRole', fixtureHunt, 'operator');
    });

    afterEach(function () {
      location.current = null;
      navigate.current = null;
    });

    const substituteUrl = (path: string) => {
      const substitutions = {
        huntId: fixtureHunt,
        puzzleId: fixturePuzzle,
        userId: Meteor.userId()!,
      };

      const url = Object.entries(substitutions).reduce((acc, [k, v]) => acc.replace(`:${k}`, v), path);
      const unreplaced = new Set([...url.matchAll(/:(\w+)/g)].map((m) => m[1]));
      if (unreplaced.size > 0) {
        if (unreplaced.has('token')) {
          console.log('Ignoring route with :token parameter');
          unreplaced.delete('token');
        }
        if (unreplaced.size === 0) {
          console.log('Skipping route', path);
          return undefined;
        }
        throw new Error(`Unknown parameters: ${[...unreplaced].join(', ')}`);
      }

      return url;
    };

    describe('which are authenticated', function () {
      before(async function () {
        await Meteor.wrapPromise(Meteor.loginWithPassword)(USER_EMAIL, USER_PASSWORD);
      });

      enumeratePaths(AuthenticatedRouteList).forEach((p) => {
        it(`works for path ${p}`, async function () {
          const url = substituteUrl(p);
          if (!url) {
            this.skip();
          }

          await act(async () => {
            render(<TestApp />);
            await stabilize();
            navigate.current!(url);
            await stabilize();
          });
        });
      });
    });

    describe('which are unauthenticated', function () {
      before(async function () {
        await Meteor.wrapPromise(Meteor.logout);
      });

      enumeratePaths(UnauthenticatedRouteList).forEach((p) => {
        it(`works for path ${p}`, async function () {
          const url = substituteUrl(p);
          if (!url) {
            this.skip();
          }

          await act(async () => {
            render(<TestApp />);
            await stabilize();
            navigate.current!(url);
            await stabilize();
          });
        });
      });
    });
  });
}
