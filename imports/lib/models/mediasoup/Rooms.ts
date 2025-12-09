import { z } from "zod";
import { foreignKey } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

// Room tracks the server assignment for a room. Its presence triggers the
// mediasoup integration to create a router.

const Room = withCommon(
  z.object({
    hunt: foreignKey,
    call: foreignKey,
    routedServer: foreignKey,
  }),
);

const Rooms = new SoftDeletedModel("jr_mediasoup_rooms", Room);
Rooms.addIndex({ call: 1 }, { unique: true });
Rooms.addIndex({ routedServer: 1 });
export type RoomType = ModelType<typeof Rooms>;

export default Rooms;
