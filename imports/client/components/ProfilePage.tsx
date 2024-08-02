import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import React from "react";
import { Navigate, useParams } from "react-router-dom";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { useBreadcrumb } from "../hooks/breadcrumb";
import OthersProfilePage from "./OthersProfilePage";
import OwnProfilePage from "./OwnProfilePage";

const ResolvedProfilePage = ({
  userId,
  isSelf,
}: {
  userId: string;
  isSelf: boolean;
}) => {
  const huntId = useParams<"huntId">().huntId;

  const profileLoading = useSubscribe("profile", userId);
  const loading = profileLoading();

  const user = useTracker(() => {
    return loading ? undefined : MeteorUsers.findOne(userId);
  }, [userId, loading]);

  useBreadcrumb({
    title: loading ? "loading..." : (user?.displayName ?? "Profile settings"),
    path: huntId ? `/hunts/${huntId}/hunters/${userId}` : `/users/${userId}`,
  });

  if (loading) {
    return <div>loading...</div>;
  } else if (!user) {
    return <div>{`No user ${userId} found.`}</div>;
  } else if (isSelf) {
    return <OwnProfilePage initialUser={user} />;
  }

  return <OthersProfilePage user={user} />;
};

const ProfilePage = () => {
  const userId = useParams<"userId">().userId!;
  const self = useTracker(() => Meteor.userId()!, []);

  if (userId === "me") {
    return <Navigate to={`/users/${self}`} replace />;
  }

  return <ResolvedProfilePage userId={userId} isSelf={userId === self} />;
};

export default ProfilePage;
