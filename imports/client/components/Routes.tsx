import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import React, { Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate, useRoutes } from "react-router-dom";
import { BreadcrumbsProvider } from "../hooks/breadcrumb";
import useDocumentTitle from "../hooks/useDocumentTitle";
import AllProfileListPage from "./AllProfileListPage";
import AnnouncementsPage from "./AnnouncementsPage";
import EnrollForm from "./EnrollForm";
import FirehosePage from "./FirehosePage";
import FirstUserForm from "./FirstUserForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import GuessQueuePage from "./GuessQueuePage";
import HuntApp from "./HuntApp";
import HuntListApp from "./HuntListApp";
import HuntListPage from "./HuntListPage";
import HuntProfileListPage from "./HuntProfileListPage";
import HuntersApp from "./HuntersApp";
import InvitedUserListPage from "./InvitedUserListPage";
import JoinHunt from "./JoinHunt";
import Loading from "./Loading";
import LoginForm from "./LoginForm";
import MoreAppPage from "./MoreAppPage";
import NotesPage from "./NotesPage";
import PasswordResetForm from "./PasswordResetForm";
import ProfilePage from "./ProfilePage";
import PuzzleListPage from "./PuzzleListPage";
import PuzzlePage from "./PuzzlePage";
import RootRedirector from "./RootRedirector";
import TagBulkEditPage from "./TagBulkEditPage";
import TagManagerPage from "./TagManagerPage";
import UserInvitePage from "./UserInvitePage";
import UsersApp from "./UsersApp";
import { AuthenticatedPage, UnauthenticatedPage } from "./authentication";

const HuntEditPage = React.lazy(() => import("./HuntEditPage"));
const SetupPage = React.lazy(() => import("./SetupPage"));
const RTCDebugPage = React.lazy(() => import("./RTCDebugPage"));
const HuntPurgePage = React.lazy(() => import("./HuntPurgePage"));

const ProfileRedirect = () => {
  const userId = useTracker(() => Meteor.userId(), []);
  if (userId) {
    return <Navigate to={`/users/${userId}`} replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
};

/* Authenticated routes - if user not logged in, get redirected to /login */
export const AuthenticatedRouteList: RouteObject[] = [
  {
    path: "/hunts",
    element: <HuntListApp />,
    children: [
      {
        path: ":huntId",
        element: <HuntApp />,
        children: [
          { path: "announcements", element: <AnnouncementsPage /> },
          { path: "firehose", element: <FirehosePage /> },
          { path: "guesses", element: <GuessQueuePage /> },
          {
            path: "hunters",
            element: <HuntersApp />,
            children: [
              { path: "", element: <HuntProfileListPage /> },
              { path: "invite", element: <UserInvitePage /> },
              { path: ":userId", element: <ProfilePage /> },
            ],
          },
          { path: "puzzles/:puzzleId", element: <PuzzlePage /> },
          { path: "tags", element: <TagBulkEditPage /> },
          { path: "tags2", element: <TagManagerPage /> },
          { path: "puzzles", element: <PuzzleListPage /> },
          { path: "edit", element: <HuntEditPage /> },
          { path: "more", element: <MoreAppPage /> },
          { path: "notes", element: <NotesPage /> },
          { path: "", element: <Navigate to="puzzles" replace /> },
          { path: "purge", element: <HuntPurgePage /> },
        ],
      },
      { path: "new", element: <HuntEditPage /> },
      { path: "", element: <HuntListPage /> },
    ],
  },
  {
    path: "/profile",
    element: (
      <AuthenticatedPage>
        <ProfileRedirect />
      </AuthenticatedPage>
    ),
  },
  {
    path: "/users",
    element: <UsersApp />,
    children: [
      { path: ":userId", element: <ProfilePage /> },
      { path: "", element: <AllProfileListPage /> },
      { path: "invited", element: <InvitedUserListPage /> },
    ],
  },
  { path: "/setup", element: <SetupPage /> },
  { path: "/rtcdebug", element: <RTCDebugPage /> },
].map((r) => {
  return {
    ...r,
    element: <AuthenticatedPage>{r.element}</AuthenticatedPage>,
  };
});

/* Unauthenticated routes - if user already logged in, get redirected to /hunts */
export const UnauthenticatedRouteList: RouteObject[] = [
  { path: "/login", element: <LoginForm /> },
  { path: "/forgot-password", element: <ForgotPasswordForm /> },
  { path: "/reset-password/:token", element: <PasswordResetForm /> },
  { path: "/enroll/:token", element: <EnrollForm /> },
  { path: "/create-first-user", element: <FirstUserForm /> },
].map((r) => {
  return {
    ...r,
    element: <UnauthenticatedPage>{r.element}</UnauthenticatedPage>,
  };
});

export const RouteList: RouteObject[] = [
  /* Index redirect */
  {
    path: "/",
    element: <RootRedirector />,
  },
  ...AuthenticatedRouteList,
  ...UnauthenticatedRouteList,
  // JoinHunt handles both authenticated and unauthenticated users.
  // Authenticated users are presented with a single button to join the hunt.
  // Unauthenticated users are presented with a login or account provisioning
  // flow that depends on the invitation code.
  { path: "/join/:invitationCode", element: <JoinHunt /> },
];

const Routes = React.memo(() => {
  useDocumentTitle("Jolly Roger");

  const routes = useRoutes(RouteList);

  return (
    <BreadcrumbsProvider>
      <Suspense fallback={<Loading />}>{routes}</Suspense>
    </BreadcrumbsProvider>
  );
});

export default Routes;
