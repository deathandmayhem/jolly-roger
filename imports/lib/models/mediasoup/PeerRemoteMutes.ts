import PeerRemoteMute from '../../schemas/mediasoup/PeerRemoteMute';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const PeerRemoteMutes = new SoftDeletedModel('jr_mediasoup_peer_remote_mutes', PeerRemoteMute);
export type PeerRemoteMuteType = ModelType<typeof PeerRemoteMutes>;

export default PeerRemoteMutes;
