import { z } from "zod";
import { foreignKey } from "../../typedModel/customTypes";
import type { ModelType } from "../../typedModel/Model";
import SoftDeletedModel from "../../typedModel/SoftDeletedModel";
import withCommon from "../../typedModel/withCommon";

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
Rooms.addIndex({ hunt: 1 });
export type RoomType = ModelType<typeof Rooms>;

export default Rooms;
