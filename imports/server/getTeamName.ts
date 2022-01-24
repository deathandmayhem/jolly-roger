import Settings from '../lib/models/Settings';

function getTeamName(): string {
  const teamNameObj = Settings.findOne({ name: 'teamname' });
  if (teamNameObj && teamNameObj.name === 'teamname') {
    return teamNameObj.value.teamName;
  }

  return 'Default Team Name';
}

export default getTeamName;
