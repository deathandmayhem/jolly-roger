import Room from '../../schemas/mediasoup/Room';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const Rooms = new SoftDeletedModel('jr_mediasoup_rooms', Room);
export type RoomType = ModelType<typeof Rooms>;

export default Rooms;
