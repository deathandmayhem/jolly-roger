import { DDP } from "meteor/ddp";
import type express from "express";
import Logger from "../../Logger";
import APIKeys from "../../lib/models/APIKeys";
import expressAsyncWrapper from "../expressAsyncWrapper";

// Update last used time only once every 60 seconds.
const API_KEY_LAST_USED_MINIMUM_TIME_DELTA_MSEC = 60000;

const authenticator: express.Handler = expressAsyncWrapper(
  async (req, res, next) => {
    const auth = req.get("Authorization");
    if (!auth) {
      res.sendStatus(401);
      return;
    }

    const [authScheme, ...authParamParts] = auth.split(" ");
    const authParam = authParamParts.join(" ");

    if (authScheme?.toLowerCase() !== "bearer") {
      res.sendStatus(403);
      return;
    }

    const key = await APIKeys.findOneAsync({ key: authParam });
    if (!key) {
      res.sendStatus(403);
      return;
    }

    const now = new Date();
    if (
      key.lastUsedAt === undefined ||
      now.getTime() - key.lastUsedAt.getTime() >=
        API_KEY_LAST_USED_MINIMUM_TIME_DELTA_MSEC
    ) {
      // If this API key was last used more than 60 seconds ago, update the
      // "last used" time on it. Do not block waiting for the write to complete.
      // Do not throw an error if updating the APIKey fails.
      APIKeys.updateAsync(
        { _id: key._id },
        { $set: { lastUsedAt: now } },
      ).catch((error) => {
        Logger.error("Ignored failure updating API key", {
          error,
          _id: key._id,
        });
      });
    }

    DDP._CurrentInvocation.withValue(
      {
        userId: key.user,
      },
      next,
    );
  },
);
export default authenticator;
