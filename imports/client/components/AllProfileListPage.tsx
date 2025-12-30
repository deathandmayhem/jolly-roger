import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import MeteorUsers from "../../lib/models/MeteorUsers";
import ProfileList from "./ProfileList";

const AllProfileListPage = () => {
  const profilesLoading = useSubscribe("allProfiles");
  const loading = profilesLoading();

  const users = useTracker(() => {
    return loading
      ? []
      : MeteorUsers.find(
          { displayName: { $ne: undefined } },
          { sort: { displayName: 1 } },
        ).fetch();
  }, [loading]);

  if (loading) {
    return <div>loading...</div>;
  }
  return <ProfileList users={users} />;
};

export default AllProfileListPage;
