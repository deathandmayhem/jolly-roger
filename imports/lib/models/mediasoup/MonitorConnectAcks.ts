import MonitorConnectAck from '../../schemas/mediasoup/MonitorConnectAck';
import type { ModelType } from '../Model';
import Model from '../Model';

const MonitorConnectAcks = new Model('jr_mediasoup_monitor_connect_acks', MonitorConnectAck);
export type MonitorConnectAckType = ModelType<typeof MonitorConnectAcks>;

export default MonitorConnectAcks;
