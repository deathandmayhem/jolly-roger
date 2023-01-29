import type { PeerType } from '../../schemas/mediasoup/Peer';
import Base from '../Base';

const Peers = new Base<PeerType>('mediasoup_peers');

export default Peers;
