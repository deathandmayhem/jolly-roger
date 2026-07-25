import { check } from "meteor/check";
import createPuzzle from "../../methods/createPuzzle";
import addPuzzle from "../addPuzzle";
import defineMethod from "./defineMethod";

defineMethod(createPuzzle, {
  run({
    huntId,
    title,
    tags,
    expectedAnswerCount,
    docType,
    url,
    allowDuplicateUrls,
    completedWithNoAnswer,
  }) {
    check(this.userId, String);
    return addPuzzle({
      huntId,
      title,
      tags,
      expectedAnswerCount,
      docType,
      url,
      allowDuplicateUrls,
      completedWithNoAnswer,
    });
  },
});
