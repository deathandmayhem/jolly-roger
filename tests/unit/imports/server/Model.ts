import { Random } from 'meteor/random';
import chai, { assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { z } from 'zod';
import Model, {
  ModelType, parseMongoModifierAsync, parseMongoOperationAsync, relaxSchema,
} from '../../../../imports/lib/models/Model';
import {
  createdTimestamp,
  lastWriteTimestamp,
  nonEmptyString,
  resetClock,
  setClock,
  stringId,
  updatedTimestamp,
} from '../../../../imports/lib/schemas/customTypes';
import { MongoRecordZodType } from '../../../../imports/lib/schemas/generateJsonSchema';
import attachSchema from '../../../../imports/server/attachSchema';
import AssertTypesEqual from '../../../lib/AssertTypesEqual';

chai.use(chaiAsPromised);

const testModels: Set<Model<any>> = new Set();

async function createTestModel<T extends MongoRecordZodType>(
  schema: T
): Promise<Model<T>> {
  const collectionName = `test_schema_${Random.id()}`;
  const model = new Model<T>(collectionName, schema);
  await attachSchema(model.schema, model.collection);
  testModels.add(model);
  return model;
}

describe('Model', function () {
  this.afterAll(async function () {
    for (const model of testModels) {
      await model.collection.dropCollectionAsync();
    }
    testModels.clear();
  });

  describe('bypassSchema', function () {
    it('works on insert', async function () {
      const schema = z.object({
        string: nonEmptyString,
      });
      const model = await createTestModel(schema);

      // Make sure the schema is validated by zod...
      await assert.isRejected(model.insertAsync({} as any), z.ZodError);
      // ...and mongo
      await assert.isRejected(model.collection.rawCollection().insertOne({} as any), /Document failed validation/);

      // But bypassing the schema should work
      const result = await model.insertAsync({} as any, { bypassSchema: true });
      assert.isString(result);

      const record = await model.findOneAsync(result);
      assert.isOk(record);
      assert.isUndefined(record!.string);
    });

    it('works on update', async function () {
      const schema = z.object({
        string: nonEmptyString,
      });
      const model = await createTestModel(schema);

      const id = await model.insertAsync({ string: 'foo' });

      // Partial updates that don't change "string" are fine. Unsetting it
      // should be a problem that Mongo catches
      await assert.isRejected(model.updateAsync(id, { $unset: { string: 1 } }), /Document failed validation/);

      // But bypassing the schema should work
      const result = await model.updateAsync(id, { $unset: { string: 1 } }, { bypassSchema: true });
      assert.equal(result, 1);

      const record = await model.findOneAsync(id);
      assert.isOk(record);
      assert.isUndefined(record!.string);
    });
  });

  describe('customTypes', function () {
    describe('stringId', function () {
      const schema = z.object({
        // Meteor will auto-populate the _id field, so to test this we need a
        // separate field
        string: stringId,
      });
      let model: Model<typeof schema>;
      this.beforeAll(async function () {
        model = await createTestModel(schema);
      });

      it('it is required by the database schema enforcement', async function () {
        await assert.isRejected(model.insertAsync({}), /Document failed validation/);

        // Also ensure the TypeScript type requires the field on output but not input
        const inputTypeTest: AssertTypesEqual<string | undefined, z.input<typeof schema>['string']> = true;
        assert.isTrue(inputTypeTest);
        const outputTypeTest: AssertTypesEqual<string, z.output<typeof schema>['string']> = true;
        assert.isTrue(outputTypeTest);
      });
    });

    describe('timestamp fields', function () {
      const schema = z.object({
        createdAt: createdTimestamp,
        updatedAt: updatedTimestamp,
        lastWrittenAt: lastWriteTimestamp,
      });
      let model: Model<typeof schema>;
      this.beforeAll(async function () {
        model = await createTestModel(schema);
      });

      this.afterEach(function () {
        resetClock();
      });

      it('have the correct types', function () {
        const recordTypeTest: AssertTypesEqual<
          ModelType<typeof model>,
          {
            _id: string;
            createdAt: Date;
            updatedAt?: Date;
            lastWrittenAt: Date;
          }
        > = true;
        assert.isTrue(recordTypeTest);
      });

      it('populates only _id, createdAt, and lastWrittenAt on insert', async function () {
        const id = await model.insertAsync({});
        const record = (await model.findOneAsync(id))!;

        assert.isOk(record);
        assert.isString(record._id);
        assert.instanceOf(record.createdAt, Date);
        assert.instanceOf(record.lastWrittenAt, Date);
        assert.isUndefined(record.updatedAt);
      });

      it('only updates updatedAt and lastWrittenAt on update', async function () {
        const initialDate = new Date();
        setClock(() => initialDate);

        const id = await model.insertAsync({});
        const record = (await model.findOneAsync(id))!;

        assert.isOk(record);
        assert.deepEqual(record.createdAt, initialDate);
        assert.deepEqual(record.lastWrittenAt, initialDate);
        assert.isUndefined(record.updatedAt);

        const laterDate = new Date(initialDate.getTime() + 1000);
        setClock(() => laterDate);

        await model.updateAsync(id, {});
        const updatedRecord = (await model.findOneAsync(id))!;

        assert.isOk(updatedRecord);
        assert.deepEqual(updatedRecord.createdAt, initialDate);
        assert.deepEqual(updatedRecord.updatedAt, laterDate);
        assert.deepEqual(updatedRecord.lastWrittenAt, laterDate);
      });

      it('populates createdAt on upsert, but not update', async function () {
        const initialDate = new Date();
        setClock(() => initialDate);

        const id = Random.id();
        await model.upsertAsync(id, {});
        const record = (await model.findOneAsync(id))!;
        assert.isOk(record);

        assert.deepEqual(record.createdAt, initialDate);
        assert.deepEqual(record.lastWrittenAt, initialDate);

        const laterDate = new Date(initialDate.getTime() + 1000);
        setClock(() => laterDate);

        await model.upsertAsync(id, {});
        const updatedRecord = (await model.findOneAsync(id))!;

        assert.isOk(updatedRecord);
        assert.deepEqual(updatedRecord.createdAt, initialDate);
      });

      it('does not populate updatedAt on upsert', async function () {
        const initialDate = new Date();
        setClock(() => initialDate);

        const id = Random.id();
        await model.upsertAsync(id, {});
        const record = (await model.findOneAsync(id))!;
        assert.isOk(record);

        assert.isUndefined(record.updatedAt);

        // It's a bit odd that updatedAt doesn't get set on an upsert that updates
        // an existing document (rather than inserting a new one), but there's no
        // $setOnNotInsert operator and this matches our historical behavior
        await model.upsertAsync(id, {});
        const updatedRecord = (await model.findOneAsync(id))!;
        assert.isOk(updatedRecord);

        assert.isUndefined(updatedRecord.updatedAt);
      });
    });
  });

  describe('relaxSchema', function () {
    it('accepts any valid modifier operation', async function () {
      const schema = z.object({
        string: nonEmptyString,
        array: z.array(nonEmptyString),
        object: z.object({
          string: nonEmptyString,
        }),
        arrayOfObjects: z.array(z.object({
          string: nonEmptyString,
        })),
        number: z.number(),
      }).or(z.object({
        unionedString: nonEmptyString,
      }));
      const relaxed = relaxSchema(schema);

      // An example $set operation
      let valid = await relaxed.safeParseAsync({
        string: 'foo',
        array: ['foo'],
        object: { string: 'foo' },
        arrayOfObjects: [{ string: 'foo' }],
      });
      assert.isTrue(valid.success);

      // A $set on the other half of the union
      valid = await relaxed.safeParseAsync({
        unionedString: 'foo',
      });
      assert.isTrue(valid.success);

      // An example $push operation
      valid = await relaxed.safeParseAsync({
        array: 'foo',
        arrayOfObjects: { string: 'foo' },
      });
      assert.isTrue(valid.success);

      // An example $addToSet operation
      valid = await relaxed.safeParseAsync({
        array: { $each: ['foo'] },
        arrayOfObjects: { $each: [{ string: 'foo' }] },
      });
      assert.isTrue(valid.success);

      // An example $inc operation
      valid = await relaxed.safeParseAsync({
        number: 1,
      });
      assert.isTrue(valid.success);
    });

    it('accepts valid modifiers for arrays with defaults', async function () {
      const schema = z.object({
        array: z.array(nonEmptyString).default([]),
      });
      const relaxed = relaxSchema(schema);

      // A $set operation (with and without a value)
      let valid = await relaxed.safeParseAsync({
        array: ['foo'],
      });
      assert.isTrue(valid.success);
      valid = await relaxed.safeParseAsync({});
      assert.isTrue(valid.success);

      // A $push operation
      valid = await relaxed.safeParseAsync({
        array: 'foo',
      });
      assert.isTrue(valid.success);

      // A $addToSet operation
      valid = await relaxed.safeParseAsync({
        array: { $each: ['foo'] },
      });
      assert.isTrue(valid.success);
    });

    it('does not enforce length limits for arrays', async function () {
      const schema = z.object({
        array: z.array(nonEmptyString).max(1),
      });
      const relaxed = relaxSchema(schema);

      const valid = await relaxed.safeParseAsync({
        array: { $each: ['foo', 'bar'] },
      });
      assert.isTrue(valid.success);
    });
  });

  describe('parseMongoOperationAsync', function () {
    it('handles transforms anywhere in the schema', async function () {
      const schema = z.object({
        string: nonEmptyString.transform((s) => s.toUpperCase()),
        array: z.array(nonEmptyString.transform((s) => s.toUpperCase())),
        object: z.object({
          string: nonEmptyString.transform((s) => s.toUpperCase()),
        }),
        arrayOfObjects: z.array(z.object({
          string: nonEmptyString.transform((s) => s.toUpperCase()),
        })),
        record: z.record(nonEmptyString, nonEmptyString.transform((s) => s.toUpperCase())),
      });
      const relaxed = relaxSchema(schema);

      let parsed = await parseMongoOperationAsync(relaxed, {
        string: 'foo',
        array: ['foo'],
        object: { string: 'foo' },
        arrayOfObjects: [{ string: 'foo' }],
        record: { foo: 'foo' },
        'array.0': 'foo',
        'object.string': 'foo',
        'arrayOfObjects.0': { string: 'foo' },
        'arrayOfObjects.0.string': 'foo',
        'record.foo': 'foo',
      });
      assert.deepEqual(parsed, {
        string: 'FOO',
        array: ['FOO'],
        object: { string: 'FOO' },
        arrayOfObjects: [{ string: 'FOO' }],
        record: { foo: 'FOO' },
        'array.0': 'FOO',
        'object.string': 'FOO',
        'arrayOfObjects.0': { string: 'FOO' },
        'arrayOfObjects.0.string': 'FOO',
        'record.foo': 'FOO',
      });

      // Try other operation formats
      parsed = await parseMongoOperationAsync(relaxed, {
        array: { $each: ['foo'] },
        arrayOfObjects: { $each: [{ string: 'foo' }] },
      });
      assert.deepEqual(parsed, {
        array: { $each: ['FOO'] },
        arrayOfObjects: { $each: [{ string: 'FOO' }] },
      });

      // $push like
      parsed = await parseMongoOperationAsync(relaxed, {
        array: 'foo',
        arrayOfObjects: { string: 'foo' },
      });
      assert.deepEqual(parsed, {
        array: 'FOO',
        arrayOfObjects: { string: 'FOO' },
      });
    });

    it('handles multiple levels of dot-separation', async function () {
      const schema = z.object({
        nested: z.object({
          moreNested: z.object({
            string: nonEmptyString.transform((s) => s.toUpperCase()),
          }),
        }),
      });
      const relaxed = relaxSchema(schema);

      const parsed = await parseMongoOperationAsync(relaxed, {
        'nested.moreNested.string': 'foo',
      });
      assert.deepEqual(parsed, {
        'nested.moreNested.string': 'FOO',
      });
    });
  });

  describe('parseMongoModifierAsync', function () {
    it('populates default values on upsert', async function () {
      const schema = z.object({
        string: nonEmptyString.default('foo'),
        array: z.array(nonEmptyString).default(['foo']),
      });
      const relaxed = relaxSchema(schema);

      let parsed = await parseMongoModifierAsync(relaxed, {}, true);
      assert.deepEqual(parsed, {
        $setOnInsert: {
          string: 'foo',
          array: ['foo'],
        },
      });

      parsed = await parseMongoModifierAsync(relaxed, {}, false);
      assert.deepEqual(parsed, {
        $setOnInsert: {
          string: 'foo',
          array: ['foo'],
        },
      });
    });
  });

  // Note: these tests are basically making assertions about TypeScript types,
  // not what occurs at runtime.
  describe('type declarations', function () {
    const schema = z.object({
      createdAt: createdTimestamp,
      updatedAt: updatedTimestamp,
      lastWrittenAt: lastWriteTimestamp,
      string: nonEmptyString,
      number: z.number(),
    });
    let model: Model<typeof schema>;
    this.beforeAll(async function () {
      model = await createTestModel(schema);
    });

    const discriminatedUnionSchema = z.discriminatedUnion('name', [
      z.object({ name: z.literal('foo'), foo: nonEmptyString }),
      z.object({ name: z.literal('bar'), bar: z.number() }),
    ]);
    let discriminatedUnionModel: Model<typeof discriminatedUnionSchema>;
    this.beforeAll(async function () {
      discriminatedUnionModel = await createTestModel(discriminatedUnionSchema);
    });

    describe('insertAsync', function () {
      it('returns a promise of the _id type', function () {
        const insertTypeTest: AssertTypesEqual<
        ReturnType<typeof model.insertAsync>,
        Promise<string>
      > = true;
        assert.isTrue(insertTypeTest);
      });
    });

    describe('updateAsync', function () {
      it('does not accept full document updates', function () {
        // @ts-expect-error - should not accept full document updates
        const modifier: Parameters<typeof model.updateAsync>[1] = { string: 'foo' };
        assert.isOk(modifier);
      });

      it('does accept mongo modifiers', function () {
        const modifier: Parameters<typeof model.updateAsync>[1] = { $set: { string: 'foo' } };
        assert.isOk(modifier);
      });
    });

    describe('findOne', function () {
      it('can narrow a discriminated union', async function () {
        const result = await discriminatedUnionModel.findOneAsync({ name: 'foo' });
        const resultTypeTest: AssertTypesEqual<
          NonNullable<typeof result>,
          { _id: string, name: 'foo', foo: string }
        > = true;
        assert.isTrue(resultTypeTest);
      });
    });
  });
});
