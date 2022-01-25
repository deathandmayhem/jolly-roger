import RoomSchema, { RoomType } from '../../schemas/mediasoup/Room';
import Base from '../Base';

const Rooms = new Base<RoomType>('mediasoup_rooms');
Rooms.attachSchema(RoomSchema);

export default Rooms;
