import { check, Match } from "meteor/check";
import type { GdriveMimeTypesType } from "../../lib/GdriveMimeTypes";
import GdriveMimeTypes from "../../lib/GdriveMimeTypes";
import createPuzzle from "../../methods/createPuzzle";
import addPuzzle from "../addPuzzle";
import defineMethod from "./defineMethod";

defineMethod(createPuzzle, {
  validate(arg) {
    check(arg, {
      huntId: String,
      title: String,
      url: Match.Optional(String),
      tags: [String],
      expectedAnswerCount: Number,
      docType: Match.OneOf(
        ...(Object.keys(GdriveMimeTypes) as GdriveMimeTypesType[]),
      ),
      allowDuplicateUrls: Match.Optional(Boolean),
    });
    return arg;
  },

  async run({
    huntId,
    title,
    tags,
    expectedAnswerCount,
    docType,
    url,
    allowDuplicateUrls,
  }) {
    check(this.userId, String);

    return addPuzzle({
      userId: this.userId,
      huntId,
      title,
      tags,
      expectedAnswerCount,
      docType,
      url,
      allowDuplicateUrls,
    });
  },
});