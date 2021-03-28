import { Mongo } from 'meteor/mongo';

interface TeamNameType {
  name: string;
}

// Pseudo-collection used to track
const TeamName = new Mongo.Collection<TeamNameType>('teamName');

export default TeamName;
