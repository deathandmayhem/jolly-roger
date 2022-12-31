import Settings from '../lib/models/Settings';

async function getTeamName(): Promise<string> {
  const teamNameObj = await Settings.findOneAsync({ name: 'teamname' });
  if (teamNameObj) {
    return teamNameObj.value.teamName;
  }

  return 'Default Team Name';
}

export default getTeamName;
