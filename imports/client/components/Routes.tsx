import React, { Suspense } from 'react';
import { Navigate, Route, Routes as ReactRouterRoutes } from 'react-router-dom';
import { BreadcrumbsProvider } from '../hooks/breadcrumb';
import useDocumentTitle from '../hooks/useDocumentTitle';
import AllProfileListPage from './AllProfileListPage';
import AnnouncementsPage from './AnnouncementsPage';
import EnrollForm from './EnrollForm';
import FirehosePage from './FirehosePage';
import FirstUserForm from './FirstUserForm';
import GuessQueuePage from './GuessQueuePage';
import HuntApp from './HuntApp';
import HuntListPage from './HuntListPage';
import HuntProfileListPage from './HuntProfileListPage';
import Loading from './Loading';
import LoginForm from './LoginForm';
import PasswordResetForm from './PasswordResetForm';
import ProfilePage from './ProfilePage';
import PuzzleListPage from './PuzzleListPage';
import PuzzlePage from './PuzzlePage';
import RootRedirector from './RootRedirector';
import UserInvitePage from './UserInvitePage';
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
          <Route path="/hunts/:huntId" element={<AuthenticatedPage><HuntApp /></AuthenticatedPage>}>
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="firehose" element={<FirehosePage />} />
            <Route path="guesses" element={<GuessQueuePage />} />
            <Route path="hunters" element={<HuntProfileListPage />} />
            <Route path="hunters/invite" element={<UserInvitePage />} />
            <Route path="puzzles/:puzzleId" element={<PuzzlePage />} />
            <Route path="puzzles" element={<PuzzleListPage />} />
            <Route path="" element={<Navigate to="puzzles" replace />} />
          </Route>
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
