/* eslint-disable jolly-roger/no-sync-mongo-methods -- We're doing a lot of
   testing of failures, and Meteor's async methods currently throw instead of
   rejecting, so just using the sync methods for now makes everything easier */
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';
import { assert } from 'chai';
import { z } from 'zod';
import generateJsonSchema, { MongoRecordZodType } from '../../../../imports/lib/schemas/generateJsonSchema';

const testCollections: Set<Mongo.Collection<any>> = new Set();

async function createTestCollection<T extends MongoRecordZodType>(
  schema: T
): Promise<Mongo.Collection<z.output<T>>> {
  const validator = { $jsonSchema: generateJsonSchema(schema) };
  const collectionName = `test_schema_${Random.id()}`;
  const collection = new Mongo.Collection<z.output<T>>(collectionName);
  await collection.rawDatabase().createCollection(collectionName, { validator });
  testCollections.add(collection);
  return collection;
}

describe('generateJsonSchema', function () {
  this.afterAll(async function () {
    for (const collection of testCollections) {
      await collection.dropCollectionAsync();
    }
    testCollections.clear();
  });

  it("rejects schemas which can't serialize to BSON", function () {
    assert.throws(() => generateJsonSchema(z.object({
      bigInt: z.bigint(),
    })), /Unsupported schema type/);
    assert.throws(() => generateJsonSchema(z.object({
      never: z.never(),
    })), /Unsupported schema type/);
    assert.throws(() => generateJsonSchema(z.object({
      map: z.map(z.string(), z.string()),
    })), /Unsupported schema type/);
  });

  it('supports records', async function () {
    const schema = z.record(z.string(), z.string());
    const collection = await createTestCollection(schema);

    assert.doesNotThrow(() => collection.insert({ foo: 'bar' }));
    assert.throws(() => collection.insert({ foo: 1 } as any), /Document failed validation/);
  });

  describe('simple objects', function () {
    const schema = z.object({
      _id: z.string(),
      string: z.string(),
      number: z.number(),
      boolean: z.boolean(),
      date: z.date(),
      null: z.null(),
    });
    let collection: Mongo.Collection<z.output<typeof schema>>;
    before(async function () {
      collection = await createTestCollection(schema);
    });

    it('accepts valid documents', function () {
      assert.doesNotThrow(() => collection.insert({
        string: 'foo', number: 1, boolean: true, date: new Date(), null: null,
      }));
    });

    it('rejects extra fields', function () {
      assert.throws(() => collection.insert({
        string: 'foo', number: 1, boolean: true, date: new Date(), null: null, extra: 'bar',
      } as any), /Document failed validation/);
    });

    it('rejects missing fields', function () {
      const record = {
        string: 'foo', number: 1, boolean: true, date: new Date(), null: null,
      };
      Object.keys(record).forEach((key) => {
        const { [key]: _discarded, ...partialRecord } = record as any;
        assert.throws(() => collection.insert(partialRecord), /Document failed validation/);
      });
    });
  });

  describe('objects with optional fields', function () {
    it('accepts present and absent fields', async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().optional(),
        number: z.number().optional(),
        boolean: z.boolean().optional(),
        date: z.date().optional(),
        null: z.null().optional(),
      });
      const collection = await createTestCollection(schema);

      assert.doesNotThrow(() => collection.insert({
        string: 'foo', number: 1, boolean: true, date: new Date(), null: null,
      }));
      assert.doesNotThrow(() => collection.insert({}));
    });
  });

  describe('objects with a catchall', function () {
    it('accepts extra fields that match the specified type', async function () {
      const schema = z.object({
        _id: z.string(),
        foo: z.string(),
      })
        // It seems like catchall should not need to include the types of fields
        // declared in the object, but because of how the types are currently
        // written, it is intersected with the object type. I think this is a
        // bug in zod (not in the json-schema generation)
        .catchall(z.string().or(z.number()));
      const collection = await createTestCollection(schema);

      assert.doesNotThrow(() => collection.insert({ foo: 'bar', baz: 1 }));

      assert.throws(() => collection.insert({ foo: 'bar', baz: true } as any), /Document failed validation/);
    });
  });

  describe('objects with passthrough', function () {
    it('accepts extra fields of any type', async function () {
      const schema = z.object({
        _id: z.string(),
        foo: z.string(),
      }).passthrough();
      const collection = await createTestCollection(schema);

      assert.doesNotThrow(() => collection.insert({ foo: 'bar', baz: 1 } as any));
      assert.doesNotThrow(() => collection.insert({ foo: 'bar', baz: true } as any));
    });
  });

  describe('string fields', function () {
    it('respects checks on strings', async function () {
      const schema = z.object({
        _id: z.string(),
        minLength: z.string().min(3).optional(),
        maxLength: z.string().max(3).optional(),
        fixedLength: z.string().length(3).optional(),
        pattern: z.string().regex(/^[a-z]+$/).optional(),
        email: z.string().email().optional(),
        uuid: z.string().uuid().optional(),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ minLength: 'a' }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ minLength: 'abcdef' }));

      assert.throws(() => collection.insert({ maxLength: 'abcd' }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ maxLength: 'ab' }));

      assert.throws(() => collection.insert({ fixedLength: 'ab' }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ fixedLength: 'abc' }));

      assert.throws(() => collection.insert({ pattern: '123' }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ pattern: 'abc' }));

      assert.throws(() => collection.insert({ email: 'foo' }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ email: 'jolly-roger@deathandmayhem.com' }));

      assert.throws(() => collection.insert({ uuid: 'foo' }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }));
    });

    it('respects strings with multiple checks', async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().min(3).max(5).regex(/^[a-z]+$/),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ string: 'a' }), /Document failed validation/);
      assert.throws(() => collection.insert({ string: 'abcdef' }), /Document failed validation/);
      assert.throws(() => collection.insert({ string: '123' }), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ string: 'abcd' }));
    });

    it('allows strings with multiple regex checks', async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().regex(/^[a-z]+$/).regex(/^[a-z]{3}$/),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ string: 'a' }), /Document failed validation/);
      assert.throws(() => collection.insert({ string: 'abcd' }), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ string: 'abc' }));
    });

    it('rejects unsupported checks', function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().startsWith('a').optional(),
      });
      assert.throws(() => generateJsonSchema(schema), /Unsupported string check/);
    });
  });

  describe('number fields', function () {
    it('respects checks on numbers', async function () {
      const schema = z.object({
        _id: z.string(),
        exclusiveMin: z.number().gt(3).optional(),
        exclusiveMax: z.number().lt(3).optional(),
        inclusiveMin: z.number().gte(3).optional(),
        inclusiveMax: z.number().lte(3).optional(),
        integer: z.number().int().optional(),
        multipleOf: z.number().multipleOf(3).optional(),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ exclusiveMin: 3 }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ exclusiveMin: 4 }));
      assert.doesNotThrow(() => collection.insert({ exclusiveMin: 3.5 }));

      assert.throws(() => collection.insert({ exclusiveMax: 3 }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ exclusiveMax: 2 }));
      assert.doesNotThrow(() => collection.insert({ exclusiveMax: 2.5 }));

      assert.throws(() => collection.insert({ inclusiveMin: 2 }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ inclusiveMin: 3 }));

      assert.throws(() => collection.insert({ inclusiveMax: 4 }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ inclusiveMax: 3 }));

      assert.throws(() => collection.insert({ integer: 3.5 }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ integer: 3 }));

      assert.throws(() => collection.insert({ multipleOf: 4 }), /Document failed validation/);
      assert.doesNotThrow(() => collection.insert({ multipleOf: 6 }));
    });

    it('respects numbers with multiple checks', async function () {
      const schema = z.object({
        _id: z.string(),
        number: z.number().gt(3).lt(10).multipleOf(2),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ number: 3 }), /Document failed validation/);
      assert.throws(() => collection.insert({ number: 10 }), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ number: 4 }));
      assert.doesNotThrow(() => collection.insert({ number: 6 }));
    });

    it('rejects unsupported checks', function () {
      const schema = z.object({
        _id: z.string(),
        number: z.number().finite(),
      });
      assert.throws(() => generateJsonSchema(schema), /Unsupported number check/);
    });
  });

  describe('enum fields', function () {
    it('supports zod enums', async function () {
      const schema = z.object({
        _id: z.string(),
        enum: z.enum(['foo', 'bar']),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ enum: 'baz' } as any), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ enum: 'foo' }));
    });

    it('supports TypeScript-native enums', async function () {
      enum Enum { foo, bar }
      const schema = z.object({
        _id: z.string(),
        enum: z.nativeEnum(Enum),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ enum: 'baz' } as any), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ enum: Enum.foo }));
    });

    it('supports a union of literals', async function () {
      // We used to do this with io-ts. We'd probably prefer z.enum instead, but
      // it's nice to know if this still works.
      const schema = z.object({
        _id: z.string(),
        enum: z.literal('foo').or(z.literal('bar')),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ enum: 'baz' } as any), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ enum: 'foo' }));
    });
  });

  describe('fields with default values', function () {
    it('supports both a default and an explicit value', async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().default('foo'),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ string: 1 } as any), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ string: 'bar' }));
      assert.doesNotThrow(() => collection.insert({} as any));
    });
  });

  describe('array fields', function () {
    it('supports simple arrays', async function () {
      const schema = z.object({
        _id: z.string(),
        array: z.array(z.string()),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ array: 'foo' } as any), /Document failed validation/);
      assert.throws(() => collection.insert({ array: [1, 2, 3] } as any), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ array: ['foo', 'bar'] }));
    });

    it('supports array of unions', async function () {
      const schema = z.object({
        _id: z.string(),
        array: z.array(z.string().or(z.number())),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ array: [true, null] } as any), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ array: ['foo', 'bar'] }));
      assert.doesNotThrow(() => collection.insert({ array: [1, 2, 3] }));
      assert.doesNotThrow(() => collection.insert({ array: ['foo', 1, 'bar', 2, 3] }));
    });
  });

  describe('top-level unions', function () {
    it('accepts objects that match either schema', async function () {
      const schema = z.object({
        _id: z.string(),
        foo: z.string(),
      }).or(z.object({
        _id: z.string(),
        bar: z.number(),
      }));
      const collection = await createTestCollection(schema);

      assert.doesNotThrow(() => collection.insert({ foo: 'foo' }));
      assert.doesNotThrow(() => collection.insert({ bar: 1 }));

      assert.throws(() => collection.insert({ foo: 'foo', bar: 1 }), /Document failed validation/);
    });
  });

  describe('top-level discriminated unions', function () {
    it('accepts objects that match either schema', async function () {
      const schema = z.discriminatedUnion('type', [
        z.object({
          _id: z.string(),
          type: z.literal('foo'),
          foo: z.string(),
        }),
        z.object({
          _id: z.string(),
          type: z.literal('bar'),
          bar: z.number(),
        }),
      ]);
      const collection = await createTestCollection(schema);

      assert.doesNotThrow(() => collection.insert({ type: 'foo', foo: 'foo' }));
      assert.doesNotThrow(() => collection.insert({ type: 'bar', bar: 1 }));

      assert.throws(() => collection.insert({ type: 'foo', foo: 'foo', bar: 1 } as any), /Document failed validation/);
      assert.throws(() => collection.insert({ type: 'foo', bar: 1 } as any), /Document failed validation/);
      assert.throws(() => collection.insert({ type: 'bar', foo: 'foo' } as any), /Document failed validation/);
    });
  });

  describe('top-level intersections', function () {
    it('only accepts objects that match both schemas', async function () {
      const schema = z.object({
        _id: z.string(),
        foo: z.string(),
      }).and(z.object({
        bar: z.number(),
      }));
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ foo: 'foo' } as any), /Document failed validation/);
      assert.throws(() => collection.insert({ bar: 1 } as any), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ foo: 'foo', bar: 1 }));
    });
  });

  describe('intersections of scalar types', function () {
    it('only accepts objects that match both schemas', async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().email().and(z.string().min(10)),
      });
      const collection = await createTestCollection(schema);

      assert.throws(() => collection.insert({ string: 'foo' }), /Document failed validation/);
      assert.throws(() => collection.insert({ string: 'foo@bar' }), /Document failed validation/);
      assert.throws(() => collection.insert({ string: 'a@b.co' }), /Document failed validation/);

      assert.doesNotThrow(() => collection.insert({ string: 'jolly-roger@deathandmayhem.com' }));
    });
  });
});
