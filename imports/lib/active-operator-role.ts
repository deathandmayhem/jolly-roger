import { Roles } from 'meteor/nicolaslopezj:roles';

const ActiveOperatorRole = new Roles.Role('operator');
ActiveOperatorRole.allow('users.makeOperator', () => true);
ActiveOperatorRole.allow('discord.listChannels', () => true);

export default ActiveOperatorRole;
