import React from 'react';
import {
  IndexRoute,
  IndexRedirect,
  Route,
  Router,
  browserHistory,
} from 'react-router';
import DocumentTitle from 'react-document-title';
import { SubsManager } from 'meteor/meteorhacks:subs-manager';
import { JRPropTypes } from '/imports/client/JRPropTypes.js';
import { App } from '/imports/client/components/App.jsx';
import { AnnouncementsPage } from '/imports/client/components/AnnouncementsPage.jsx';
import { Authenticator } from '/imports/client/components/Authenticator.jsx';
import { EnrollForm } from '/imports/client/components/EnrollForm.jsx';
import { GuessQueuePage } from '/imports/client/components/GuessQueuePage.jsx';
import { HuntApp } from '/imports/client/components/HuntApp.jsx';
import { HuntListPage } from '/imports/client/components/HuntListPage.jsx';
import { HuntPage } from '/imports/client/components/HuntPage.jsx';
import { LoginForm } from '/imports/client/components/LoginForm.jsx';
import { PasswordResetForm } from '/imports/client/components/PasswordResetForm.jsx';
import { ProfileListPage } from '/imports/client/components/ProfileListPage.jsx';
import { ProfilePage } from '/imports/client/components/ProfilePage.jsx';
import { PuzzleListPage } from '/imports/client/components/PuzzleListPage.jsx';
import { PuzzlePage } from '/imports/client/components/PuzzlePage.jsx';
import { SetupPage } from '/imports/client/components/SetupPage.jsx';
import { SplashPage } from '/imports/client/components/SplashPage.jsx';
import { UserInvitePage } from '/imports/client/components/UserInvitePage.jsx';

const Routes = React.createClass({
  childContextTypes: {
    subs: JRPropTypes.subs,
  },

  getChildContext() {
    if (!this.subs) {
      this.subs = new SubsManager({ cacheLimit: 20, expireIn: 1 });
    }

    return { subs: this.subs };
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
                <Route path="puzzles/:puzzleId" component={PuzzlePage} />
                <Route path="puzzles" component={PuzzleListPage} />
                <IndexRoute component={HuntPage} />
              </Route>
              <Route path="hunts" component={HuntListPage} />
              <Route path="users/invite" component={UserInvitePage} />
              <Route path="users/:userId" component={ProfilePage} />
              <Route path="users" component={ProfileListPage} />
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
