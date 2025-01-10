import type express from "express";
import APIKeys from "../../lib/models/APIKeys";
import expressAsyncWrapper from "../expressAsyncWrapper";

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

    next();
  },
);
export default authenticator;
