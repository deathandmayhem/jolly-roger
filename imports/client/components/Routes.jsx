import React from 'react';
import IndexRedirect from 'react-router/lib/IndexRedirect';
import Route from 'react-router/lib/Route';
import Router from 'react-router/lib/Router';
import browserHistory from 'react-router/lib/browserHistory';
import DocumentTitle from 'react-document-title';
import Loadable from 'react-loadable';
import { SubsCache } from 'meteor/ccorcos:subs-cache';
import { Loading } from '/imports/client/components/Loading.jsx';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { Authenticator } from '/imports/client/components/Authenticator.jsx';
import { LoginForm } from '/imports/client/components/LoginForm.jsx';
import { NavAggregator, navAggregatorType } from '/imports/client/components/NavAggregator.jsx';
import { SplashPage } from '/imports/client/components/SplashPage.jsx';

const makeLoadable = function (f) {
  return Loadable({
    loader: f,
    loading: Loading,
  });
};

const AllProfileListPage = makeLoadable(
  () => import('/imports/client/components/AllProfileListPage.jsx'));
const App = makeLoadable(() => import('/imports/client/components/App.jsx'));
const AnnouncementsPage = makeLoadable(
  () => import('/imports/client/components/AnnouncementsPage.jsx'));
const EnrollForm = makeLoadable(() => import('/imports/client/components/EnrollForm.jsx'));
const GuessQueuePage = makeLoadable(() => import('/imports/client/components/GuessQueuePage.jsx'));
const HuntApp = makeLoadable(() => import('/imports/client/components/HuntApp.jsx'));
const HuntListPage = makeLoadable(() => import('/imports/client/components/HuntListPage.jsx'));
const HuntProfileListPage = makeLoadable(
  () => import('/imports/client/components/HuntProfileListPage.jsx'));
const PasswordResetForm = makeLoadable(
  () => import('/imports/client/components/PasswordResetForm.jsx'));
const ProfilePage = makeLoadable(() => import('/imports/client/components/ProfilePage.jsx'));
const PuzzlePage = makeLoadable(() => import('/imports/client/components/PuzzlePage.jsx'));
const PuzzleListPage = makeLoadable(() => import('/imports/client/components/PuzzleListPage.jsx'));
const SetupPage = makeLoadable(() => import('/imports/client/components/SetupPage.jsx'));
const UserInvitePage = makeLoadable(() => import('/imports/client/components/UserInvitePage.jsx'));

const Routes = React.createClass({
  childContextTypes: {
    subs: JRPropTypes.subs,
    navAggregator: navAggregatorType,
  },

  getChildContext() {
    if (!this.subs) {
      this.subs = new SubsCache({ cacheLimit: -1, expireAfter: 1 });
    }

    if (!this.navAggregator) {
      this.navAggregator = new NavAggregator();
    }

    return {
      subs: this.subs,
      navAggregator: this.navAggregator,
    };
  },

  render() {
    return (
      <DocumentTitle title="Jolly Roger">
        <Router history={browserHistory}>
          {/* Authenticated routes */}
          <Route path="/" component={Authenticator} authenticated>
            <IndexRedirect to="hunts" />
            <Route path="" component={App}>
              <Route path="hunts/:huntId" component={HuntApp}>
                <Route path="announcements" component={AnnouncementsPage} />
                <Route path="guesses" component={GuessQueuePage} />
                <Route path="hunters" component={HuntProfileListPage} />
                <Route path="hunters/invite" component={UserInvitePage} />
                <Route path="puzzles/:puzzleId" component={PuzzlePage} />
                <Route path="puzzles" component={PuzzleListPage} />
                <IndexRedirect to="puzzles" />
              </Route>
              <Route path="hunts" component={HuntListPage} />
              <Route path="users/:userId" component={ProfilePage} />
              <Route path="users" component={AllProfileListPage} />
              <Route path="setup" component={SetupPage} />
            </Route>
          </Route>
          {/* Unauthenticated routes */}
          <Route path="/" component={Authenticator} authenticated={false}>
            <Route path="" component={SplashPage}>
              <Route path="login" component={LoginForm} />
              <Route path="reset-password/:token" component={PasswordResetForm} />
              <Route path="enroll/:token" component={EnrollForm} />
            </Route>
          </Route>
          {/* Routes available to both authenticated and unauthenticated users */}
        </Router>
      </DocumentTitle>
    );
  },
});

export { Routes };
