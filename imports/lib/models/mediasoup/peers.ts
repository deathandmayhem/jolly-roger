import { huntsMatchingCurrentUser } from '../../../model-helpers';
import PeerSchema, { PeerType } from '../../schemas/mediasoup/peer';
import Base from '../base';

const Peers = new Base<PeerType>('mediasoup_peers');
Peers.attachSchema(PeerSchema);
Peers.publish(huntsMatchingCurrentUser);

export default Peers;
