import PeerRemoteMuteSchema, { PeerRemoteMuteType } from '../../schemas/mediasoup/PeerRemoteMute';
import Base from '../Base';

const PeerRemoteMutes = new Base<PeerRemoteMuteType>('mediasoup_peer_remote_mutes');
PeerRemoteMutes.attachSchema(PeerRemoteMuteSchema);

export default PeerRemoteMutes;
