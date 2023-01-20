import { Mongo } from 'meteor/mongo';
import type { MonitorConnectAckType } from '../../schemas/mediasoup/MonitorConnectAck';
import MonitorConnectAckSchema from '../../schemas/mediasoup/MonitorConnectAck';

const MonitorConnectAcks = new Mongo.Collection<MonitorConnectAckType>('jr_mediasoup_monitor_connect_acks');
MonitorConnectAcks.attachSchema(MonitorConnectAckSchema);
export default MonitorConnectAcks;
