import MonitorConnectRequest from '../../schemas/mediasoup/MonitorConnectRequest';
import type { ModelType } from '../Model';
import Model from '../Model';

const MonitorConnectRequests = new Model('jr_mediasoup_monitor_connect_requests', MonitorConnectRequest);
export type MonitorConnectRequestType = ModelType<typeof MonitorConnectRequests>;

export default MonitorConnectRequests;
