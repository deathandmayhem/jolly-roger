import { Mongo } from 'meteor/mongo';
import type { MonitorConnectRequestType } from '../../schemas/mediasoup/MonitorConnectRequest';
import MonitorConnectRequestSchema from '../../schemas/mediasoup/MonitorConnectRequest';

const MonitorConnectRequests = new Mongo.Collection<MonitorConnectRequestType>('jr_mediasoup_monitor_connect_requests');
MonitorConnectRequests.attachSchema(MonitorConnectRequestSchema);
export default MonitorConnectRequests;
