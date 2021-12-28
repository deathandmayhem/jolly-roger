import RoomSchema, { RoomType } from '../../schemas/mediasoup/room';
import Base from '../base';

const Rooms = new Base<RoomType>('mediasoup_rooms');
Rooms.attachSchema(RoomSchema);

export default Rooms;
