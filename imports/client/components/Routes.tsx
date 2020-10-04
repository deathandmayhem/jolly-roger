import React from 'react';
import { BreadcrumbsProvider } from 'react-breadcrumbs-context';
import DocumentTitle from 'react-document-title';
import { Route, Switch } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import AllProfileListPage from './AllProfileListPage';
import AuthenticatedRoute from './AuthenticatedRoute';
import EnrollForm from './EnrollForm';
import HuntApp from './HuntApp';
import HuntListPage from './HuntListPage';
import LoginForm from './LoginForm';
import PasswordResetForm from './PasswordResetForm';
import ProfilePage from './ProfilePage';
import RootRedirector from './RootRedirector';
import SetupPage from './SetupPage';
import UnauthenticatedRoute from './UnauthenticatedRoute';

class Routes extends React.Component {
  render() {
    return (
      <DocumentTitle title="Jolly Roger">
        <BreadcrumbsProvider>
          <BrowserRouter>
            <Switch>
              {/* Index redirect */}
              <Route exact path="/" component={RootRedirector} />

              {/* Authenticated routes - if user not logged in, get redirected to /login */}
              <AuthenticatedRoute path="/hunts/:huntId" component={HuntApp} />
              <AuthenticatedRoute path="/hunts" component={HuntListPage} />
              <AuthenticatedRoute path="/users/:userId" component={ProfilePage} />
              <AuthenticatedRoute path="/users" component={AllProfileListPage} />
              <AuthenticatedRoute path="/setup" component={SetupPage} />

              {/* Unauthenticated routes - if user already logged in, get redirected to /hunts */}
              <UnauthenticatedRoute path="/login" component={LoginForm} />
              <UnauthenticatedRoute path="/reset-password/:token" component={PasswordResetForm} />
              <UnauthenticatedRoute path="/enroll/:token" component={EnrollForm} />

              {/* Routes available to both authenticated and unauthenticated users */}
            </Switch>
          </BrowserRouter>
        </BreadcrumbsProvider>
      </DocumentTitle>
    );
  }
}

export default Routes;
