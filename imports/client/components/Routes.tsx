import React from 'react';
import { BreadcrumbsProvider } from 'react-breadcrumbs-context';
import { Route, Switch } from 'react-router';
import AllProfileListPage from './AllProfileListPage';
import AuthenticatedRoute from './AuthenticatedRoute';
import DocumentTitle from './DocumentTitle';
import EnrollForm from './EnrollForm';
import FirstUserForm from './FirstUserForm';
import HuntApp from './HuntApp';
import HuntListPage from './HuntListPage';
import LoginForm from './LoginForm';
import PasswordResetForm from './PasswordResetForm';
import ProfilePage from './ProfilePage';
import RTCDebugPage from './RTCDebugPage';
import RootRedirector from './RootRedirector';
import SetupPage from './SetupPage';
import UnauthenticatedRoute from './UnauthenticatedRoute';

class Routes extends React.PureComponent {
  render() {
    return (
      <DocumentTitle title="Jolly Roger">
        <BreadcrumbsProvider>
          <Switch>
            {/* Index redirect */}
            <Route exact path="/" component={RootRedirector} />

            {/* Authenticated routes - if user not logged in, get redirected to /login */}
            <AuthenticatedRoute path="/hunts/:huntId" component={HuntApp} />
            <AuthenticatedRoute path="/hunts" component={HuntListPage} />
            <AuthenticatedRoute path="/users/:userId" component={ProfilePage} />
            <AuthenticatedRoute path="/users" component={AllProfileListPage} />
            <AuthenticatedRoute path="/setup" component={SetupPage} />
            <AuthenticatedRoute path="/rtcdebug" component={RTCDebugPage} />

            {/* Unauthenticated routes - if user already logged in, get redirected to /hunts */}
            <UnauthenticatedRoute path="/login" component={LoginForm} />
            <UnauthenticatedRoute path="/reset-password/:token" component={PasswordResetForm} />
            <UnauthenticatedRoute path="/enroll/:token" component={EnrollForm} />
            <UnauthenticatedRoute path="/create-first-user" component={FirstUserForm} />
          </Switch>
        </BreadcrumbsProvider>
      </DocumentTitle>
    );
  }
}

export default Routes;
