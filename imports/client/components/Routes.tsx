import React, { Suspense } from 'react';
import { Route, Routes as ReactRouterRoutes } from 'react-router-dom';
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
        <ReactRouterRoutes>
          {/* Index redirect */}
          <Route path="/" element={<RootRedirector />} />

          {/* Authenticated routes - if user not logged in, get redirected to /login */}
          <Route path="/hunts/:huntId/*" element={<AuthenticatedPage><HuntApp /></AuthenticatedPage>} />
          <Route path="/hunts" element={<AuthenticatedPage><HuntListPage /></AuthenticatedPage>} />
          <Route path="/users/:userId" element={<AuthenticatedPage><ProfilePage /></AuthenticatedPage>} />
          <Route path="/users" element={<AuthenticatedPage><AllProfileListPage /></AuthenticatedPage>} />
          <Route path="/setup" element={<AuthenticatedPage><SetupPage /></AuthenticatedPage>} />
          <Route path="/rtcdebug" element={<AuthenticatedPage><RTCDebugPage /></AuthenticatedPage>} />

          {/* Unauthenticated routes - if user already logged in, get redirected to /hunts */}
          <Route path="/login" element={<UnauthenticatedPage><LoginForm /></UnauthenticatedPage>} />
          <Route path="/reset-password/:token" element={<UnauthenticatedPage><PasswordResetForm /></UnauthenticatedPage>} />
          <Route path="/enroll/:token" element={<UnauthenticatedPage><EnrollForm /></UnauthenticatedPage>} />
          <Route path="/create-first-user" element={<UnauthenticatedPage><FirstUserForm /></UnauthenticatedPage>} />
        </ReactRouterRoutes>
      </Suspense>
    </BreadcrumbsProvider>
  );
});

export default Routes;
