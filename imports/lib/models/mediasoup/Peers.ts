import { huntsMatchingCurrentUser } from '../../../model-helpers';
import type { PeerType } from '../../schemas/mediasoup/Peer';
import Base from '../Base';

const Peers = new Base<PeerType>('mediasoup_peers');
Peers.publish(huntsMatchingCurrentUser);

export default Peers;
