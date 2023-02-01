import Peer from '../../schemas/mediasoup/Peer';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const Peers = new SoftDeletedModel('jr_mediasoup_peers', Peer);
export type PeerType = ModelType<typeof Peers>;

export default Peers;
