import { assert } from "chai";
import { z } from "zod";

import {
  allowedEmptyString,
  nonEmptyString,
} from "../../../../imports/lib/models/customTypes";
import validateSchema from "../../../../imports/lib/models/validateSchema";

describe("validateSchema", function () {
  it("allows non-empty strings (explicit or using the nonEmptyString helper)", function () {
    assert.doesNotThrow(() => validateSchema(z.string().min(1)));
    assert.doesNotThrow(() => validateSchema(nonEmptyString));
  });

  it("allows empty strings with allowedEmptyString helper", function () {
    assert.doesNotThrow(() => validateSchema(allowedEmptyString));
  });

  it("does not allow other empty strings", function () {
    assert.throws(() => validateSchema(z.string()));
    assert.throws(() => validateSchema(z.string().optional()));
  });
});
