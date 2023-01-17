import type { RoomType } from '../../schemas/mediasoup/Room';
import Base from '../Base';

const Rooms = new Base<RoomType>('mediasoup_rooms');

export default Rooms;
