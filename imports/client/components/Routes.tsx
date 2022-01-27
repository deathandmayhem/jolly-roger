import React, { Suspense } from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
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

/* Authenticated routes - if user not logged in, get redirected to /login */
export const AuthenticatedRouteList: RouteObject[] = [
  {
    path: '/hunts/:huntId',
    element: <HuntApp />,
    children: [
      { path: 'announcements', element: <AnnouncementsPage /> },
      { path: 'firehose', element: <FirehosePage /> },
      { path: 'guesses', element: <GuessQueuePage /> },
      { path: 'hunters', element: <HuntProfileListPage /> },
      { path: 'hunters/invite', element: <UserInvitePage /> },
      { path: 'puzzles/:puzzleId', element: <PuzzlePage /> },
      { path: 'puzzles', element: <PuzzleListPage /> },
      { path: '', element: <Navigate to="puzzles" replace /> },
    ],
  },
  { path: '/hunts', element: <HuntListPage /> },
  { path: '/users/:userId', element: <ProfilePage /> },
  { path: '/users', element: <AllProfileListPage /> },
  { path: '/setup', element: <SetupPage /> },
  { path: '/rtcdebug', element: <RTCDebugPage /> },
].map((r) => {
  return {
    ...r,
    element: <AuthenticatedPage>{r.element}</AuthenticatedPage>,
  };
});

/* Unauthenticated routes - if user already logged in, get redirected to /hunts */
export const UnauthenticatedRouteList: RouteObject[] = [
  { path: '/login', element: <LoginForm /> },
  { path: '/reset-password/:token', element: <PasswordResetForm /> },
  { path: '/enroll/:token', element: <EnrollForm /> },
  { path: '/create-first-user', element: <FirstUserForm /> },
].map((r) => {
  return {
    ...r,
    element: <UnauthenticatedPage>{r.element}</UnauthenticatedPage>,
  };
});

export const RouteList: RouteObject[] = [
  /* Index redirect */
  {
    path: '/',
    element: <RootRedirector />,
  },
  ...AuthenticatedRouteList,
  ...UnauthenticatedRouteList,
];

const Routes = React.memo(() => {
  useDocumentTitle('Jolly Roger');

  const routes = useRoutes(RouteList);

  return (
    <BreadcrumbsProvider>
      <Suspense fallback={<Loading />}>
        {routes}
      </Suspense>
    </BreadcrumbsProvider>
  );
});

export default Routes;
