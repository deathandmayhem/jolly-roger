import { Random } from "meteor/random";
import { assert } from "chai";
import { z } from "zod";
import {
  createdTimestamp,
  nonEmptyString,
  stringId,
  updatedTimestamp,
} from "../../../../imports/lib/typedModel/customTypes";
import Model, {
  type InsertModelType,
  type ModelType,
  resetClock,
  setClock,
} from "../../../../imports/lib/typedModel/Model";
import attachSchema from "../../../../imports/server/attachSchema";
import type AssertTypesEqual from "../../../lib/AssertTypesEqual";

const testModels: Set<Model<any>> = new Set();

async function createTestModel<T extends z.ZodType>(
  schema: T,
): Promise<Model<T>> {
  const collectionName = `test_schema_${Random.id()}`;
  const model = new Model<T>(collectionName, schema);
  await attachSchema(model.schema, model.collection as any);
  testModels.add(model);
  return model;
}

describe("Model", function () {
  this.afterAll(async function () {
    for (const model of testModels) {
      await model.collection.dropCollectionAsync();
    }
    testModels.clear();
  });

  describe("customTypes", function () {
    describe("stringId", function () {
      const schema = z.object({
        // Meteor will auto-populate the _id field, so to test this we need a
        // separate field
        string: stringId,
      });
      let model: Model<typeof schema>;
      this.beforeAll(async function () {
        model = await createTestModel(schema);
      });

      it("it is required by the database schema enforcement", async function () {
        await assert.isRejected(
          model.insertAsync({}),
          /Document failed validation/,
        );

        // Make sure that it's required on the model type, but not on the insert
        // type
        const recordTypeTest: AssertTypesEqual<
          string,
          ModelType<typeof model>["string"]
        > = true;
        assert.isTrue(recordTypeTest);
        const insertTypeTest: AssertTypesEqual<
          string | undefined,
          InsertModelType<(typeof model)["schema"]>["string"]
        > = true;
        assert.isTrue(insertTypeTest);
      });
    });

    describe("timestamp fields", function () {
      const schema = z.object({
        createdAt: createdTimestamp,
        updatedAt: updatedTimestamp,
      });
      let model: Model<typeof schema>;
      this.beforeAll(async function () {
        model = await createTestModel(schema);
      });

      this.afterEach(function () {
        resetClock();
      });

      it("have the correct types", function () {
        const recordTypeTest: AssertTypesEqual<
          ModelType<typeof model>,
          {
            _id: string;
            createdAt: Date;
            updatedAt: Date;
          }
        > = true;
        assert.isTrue(recordTypeTest);
      });

      it("populates _id, createdAt, and updatedAt on insert", async function () {
        const id = await model.insertAsync({});
        const record = (await model.findOneAsync(id))!;

        assert.isOk(record);
        assert.isString(record._id);
        assert.instanceOf(record.createdAt, Date);
        assert.instanceOf(record.updatedAt, Date);
        assert.hasAllKeys(record, ["_id", "createdAt", "updatedAt"]);
      });

      it("only updates updatedAt on update", async function () {
        const initialDate = new Date();
        setClock(() => initialDate);

        const id = await model.insertAsync({});
        const record = (await model.findOneAsync(id))!;

        assert.isOk(record);
        assert.deepEqual(record.createdAt, initialDate);
        assert.deepEqual(record.updatedAt, initialDate);
        assert.hasAllKeys(record, ["_id", "createdAt", "updatedAt"]);

        const laterDate = new Date(initialDate.getTime() + 1000);
        setClock(() => laterDate);

        await model.updateAsync(id, {});
        const updatedRecord = (await model.findOneAsync(id))!;

        assert.isOk(updatedRecord);
        assert.hasAllKeys(updatedRecord, ["_id", "createdAt", "updatedAt"]);
        assert.deepEqual(updatedRecord.createdAt, initialDate);
        assert.deepEqual(updatedRecord.updatedAt, laterDate);
      });

      it("populates createdAt and updatedAt on upsert", async function () {
        const initialDate = new Date();
        setClock(() => initialDate);

        const id = Random.id();
        await model.upsertAsync(id, {});
        const record = (await model.findOneAsync(id))!;
        assert.isOk(record);

        assert.deepEqual(record.createdAt, initialDate);
        assert.deepEqual(record.updatedAt, initialDate);
        assert.hasAllKeys(record, ["_id", "createdAt", "updatedAt"]);

        const laterDate = new Date(initialDate.getTime() + 1000);
        setClock(() => laterDate);

        await model.upsertAsync(id, {});
        const updatedRecord = (await model.findOneAsync(id))!;

        assert.isOk(updatedRecord);
        assert.hasAllKeys(updatedRecord, ["_id", "createdAt", "updatedAt"]);
        assert.deepEqual(updatedRecord.createdAt, initialDate);
        assert.deepEqual(updatedRecord.updatedAt, laterDate);
      });
    });
  });

  // Note: these tests are basically making assertions about TypeScript types,
  // not what occurs at runtime.
  describe("type declarations", function () {
    const schema = z.object({
      createdAt: createdTimestamp,
      updatedAt: updatedTimestamp,
      string: nonEmptyString,
      number: z.number(),
    });
    let model: Model<typeof schema>;
    this.beforeAll(async function () {
      model = await createTestModel(schema);
    });

    const discriminatedUnionSchema = z.discriminatedUnion("name", [
      z.object({ name: z.literal("foo"), foo: nonEmptyString }),
      z.object({ name: z.literal("bar"), bar: z.number() }),
    ]);
    let discriminatedUnionModel: Model<typeof discriminatedUnionSchema>;
    this.beforeAll(async function () {
      discriminatedUnionModel = await createTestModel(discriminatedUnionSchema);
    });

    describe("insertAsync", function () {
      it("returns a promise of the _id type", function () {
        const insertTypeTest: AssertTypesEqual<
          ReturnType<typeof model.insertAsync>,
          Promise<string>
        > = true;
        assert.isTrue(insertTypeTest);
      });
    });

    describe("updateAsync", function () {
      it("accepts full document updates", function () {
        const modifierDoc = {
          string: "foo",
        };

        // We expected that this would require an @ts-expect-error, but for some reason it does not
        const modifier: Parameters<typeof model.updateAsync>[1] = modifierDoc;
        assert.isOk(modifier);
      });

      it("accepts mongo modifiers", function () {
        const modifier: Parameters<typeof model.updateAsync>[1] = {
          $set: { string: "foo" },
        };
        assert.isOk(modifier);
      });
    });

    describe("findOne", function () {
      it("can narrow a discriminated union", async function () {
        const result = await discriminatedUnionModel.findOneAsync({
          name: "foo",
        });
        const resultTypeTest: AssertTypesEqual<
          NonNullable<typeof result>,
          { _id: string; name: "foo"; foo: string }
        > = true;
        assert.isTrue(resultTypeTest);
      });
    });
  });
});
