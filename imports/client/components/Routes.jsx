import React from 'react';
import {
  IndexRedirect,
  Route,
  Router,
  browserHistory,
} from 'react-router';
import DocumentTitle from 'react-document-title';
import AllProfileListPage from './AllProfileListPage.jsx';
import App from './App.jsx';
import AnnouncementsPage from './AnnouncementsPage.jsx';
import Authenticator from './Authenticator.jsx';
import EnrollForm from './EnrollForm.jsx';
import GuessQueuePage from './GuessQueuePage.jsx';
import HuntApp from './HuntApp.jsx';
import HuntListPage from './HuntListPage.jsx';
import HuntProfileListPage from './HuntProfileListPage.jsx';
import LoginForm from './LoginForm.jsx';
import NavAggregator from './NavAggregator.jsx';
import navAggregatorType from './navAggregatorType.jsx';
import PasswordResetForm from './PasswordResetForm.jsx';
import ProfilePage from './ProfilePage.jsx';
import PuzzleListPage from './PuzzleListPage.jsx';
import PuzzlePage from './PuzzlePage.jsx';
import SetupPage from './SetupPage.jsx';
import SplashPage from './SplashPage.jsx';
import UserInvitePage from './UserInvitePage.jsx';

const Routes = React.createClass({
  childContextTypes: {
    navAggregator: navAggregatorType,
  },

  getChildContext() {
    if (!this.navAggregator) {
      this.navAggregator = new NavAggregator();
    }

    return {
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

export default Routes;
