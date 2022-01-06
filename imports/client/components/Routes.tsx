import React, { Suspense } from 'react';
import { Route, Switch } from 'react-router';
import { BreadcrumbsProvider } from '../hooks/breadcrumb';
import useDocumentTitle from '../hooks/use-document-title';
import AllProfileListPage from './AllProfileListPage';
import EnrollForm from './EnrollForm';
import FirstUserForm from './FirstUserForm';
import HuntApp from './HuntApp';
import HuntListPage from './HuntListPage';
import Loading from './Loading';
import LoginForm from './LoginForm';
import PasswordResetForm from './PasswordResetForm';
import ProfilePage from './ProfilePage';
import RootRedirector from './RootRedirector';
import { AuthenticatedPage, UnauthenticatedPage } from './authentication';

const SetupPage = React.lazy(() => import('./SetupPage'));
const RTCDebugPage = React.lazy(() => import('./RTCDebugPage'));

const Routes = React.memo(() => {
  useDocumentTitle('Jolly Roger');

  return (
    <BreadcrumbsProvider>
      <Suspense fallback={<Loading />}>
        <Switch>
          {/* Index redirect */}
          <Route exact path="/" render={() => <RootRedirector />} />

          {/* Authenticated routes - if user not logged in, get redirected to /login */}
          <Route path="/hunts/:huntId" render={() => <AuthenticatedPage><HuntApp /></AuthenticatedPage>} />
          <Route path="/hunts" render={() => <AuthenticatedPage><HuntListPage /></AuthenticatedPage>} />
          <Route path="/users/:userId" render={() => <AuthenticatedPage><ProfilePage /></AuthenticatedPage>} />
          <Route path="/users" render={() => <AuthenticatedPage><AllProfileListPage /></AuthenticatedPage>} />
          <Route path="/setup" render={() => <AuthenticatedPage><SetupPage /></AuthenticatedPage>} />
          <Route path="/rtcdebug" render={() => <AuthenticatedPage><RTCDebugPage /></AuthenticatedPage>} />

          {/* Unauthenticated routes - if user already logged in, get redirected to /hunts */}
          <Route path="/login" render={() => <UnauthenticatedPage><LoginForm /></UnauthenticatedPage>} />
          <Route path="/reset-password/:token" render={() => <UnauthenticatedPage><PasswordResetForm /></UnauthenticatedPage>} />
          <Route path="/enroll/:token" render={() => <UnauthenticatedPage><EnrollForm /></UnauthenticatedPage>} />
          <Route path="/create-first-user" render={() => <UnauthenticatedPage><FirstUserForm /></UnauthenticatedPage>} />
        </Switch>
      </Suspense>
    </BreadcrumbsProvider>
  );
});

export default Routes;
