import express from "express";
import expressAsyncWrapper from "../../expressAsyncWrapper";
import { MongoInternals } from "meteor/mongo";

const health = express.Router();

health.get(
  "/",
  expressAsyncWrapper(async (req, res) => {
    try {
      await MongoInternals.defaultRemoteCollectionDriver().mongo.db.command({
        ping: 1,
      });
      res.status(200).json({ status: "success" });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ status: "error" });
    }
  }),
);

export default health;
