import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import TeamName from "../TeamName";

const useTeamName = () => {
  const teamNameLoading = useSubscribe("teamName");
  const teamName = useTracker(() => {
    return TeamName.findOne("teamName")?.name ?? "Default Team Name";
  }, []);
  return {
    teamName,
    teamNameLoading,
  };
};

export default useTeamName;
