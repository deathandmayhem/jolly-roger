import { PeerRemoteMuteType } from '../../schemas/mediasoup/PeerRemoteMute';
import Base from '../Base';

const PeerRemoteMutes = new Base<PeerRemoteMuteType>('mediasoup_peer_remote_mutes');

export default PeerRemoteMutes;
