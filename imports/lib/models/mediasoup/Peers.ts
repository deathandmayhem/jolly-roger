import { huntsMatchingCurrentUser } from '../../../model-helpers';
import PeerSchema, { PeerType } from '../../schemas/mediasoup/Peer';
import Base from '../Base';

const Peers = new Base<PeerType>('mediasoup_peers');
Peers.attachSchema(PeerSchema);
Peers.publish(huntsMatchingCurrentUser);

export default Peers;
