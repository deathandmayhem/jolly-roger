import { Mongo } from "meteor/mongo";
import { Random } from "meteor/random";
import { assert } from "chai";
import { z } from "zod";
import generateJsonSchema, {
  type MongoRecordZodType,
} from "../../../../imports/lib/models/generateJsonSchema";

const testCollections: Set<Mongo.Collection<any>> = new Set();

async function createTestCollection<T extends MongoRecordZodType>(
  schema: T,
): Promise<Mongo.Collection<z.output<T>>> {
  const validator = { $jsonSchema: generateJsonSchema(schema) };
  const collectionName = `test_schema_${Random.id()}`;
  const collection = new Mongo.Collection<z.output<T>>(collectionName);
  await collection
    .rawDatabase()
    .createCollection(collectionName, { validator });
  testCollections.add(collection);
  return collection;
}

describe("generateJsonSchema", function () {
  this.afterAll(async function () {
    for (const collection of testCollections) {
      await collection.dropCollectionAsync();
    }
    testCollections.clear();
  });

  it("rejects schemas which can't serialize to BSON", function () {
    assert.throws(
      () =>
        generateJsonSchema(
          z.object({
            bigInt: z.bigint(),
          }),
        ),
      /Unsupported schema type/,
    );
    assert.throws(
      () =>
        generateJsonSchema(
          z.object({
            never: z.never(),
          }),
        ),
      /Unsupported schema type/,
    );
    assert.throws(
      () =>
        generateJsonSchema(
          z.object({
            map: z.map(z.string(), z.string()),
          }),
        ),
      /Unsupported schema type/,
    );
  });

  it("supports records", async function () {
    const schema = z.record(z.string(), z.string());
    const collection = await createTestCollection(schema);

    await assert.isFulfilled(collection.insertAsync({ foo: "bar" }));
    await assert.isRejected(
      collection.insertAsync({ foo: 1 } as any),
      /Document failed validation/,
    );
  });

  describe("simple objects", function () {
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

    it("accepts valid documents", async function () {
      await assert.isFulfilled(
        collection.insertAsync({
          string: "foo",
          number: 1,
          boolean: true,
          date: new Date(),
          null: null,
        }),
      );
    });

    it("rejects extra fields", async function () {
      await assert.isRejected(
        collection.insertAsync({
          string: "foo",
          number: 1,
          boolean: true,
          date: new Date(),
          null: null,
          extra: "bar",
        } as any),
        /Document failed validation/,
      );
    });

    it("rejects missing fields", async function () {
      const record = {
        string: "foo",
        number: 1,
        boolean: true,
        date: new Date(),
        null: null,
      };
      for (const key of Object.keys(record)) {
        const { [key]: _discarded, ...partialRecord } = record as any;
        await assert.isRejected(
          collection.insertAsync(partialRecord),
          /Document failed validation/,
        );
      }
    });
  });

  describe("objects with optional fields", function () {
    it("accepts present and absent fields", async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().optional(),
        number: z.number().optional(),
        boolean: z.boolean().optional(),
        date: z.date().optional(),
        null: z.null().optional(),
      });
      const collection = await createTestCollection(schema);

      await assert.isFulfilled(
        collection.insertAsync({
          string: "foo",
          number: 1,
          boolean: true,
          date: new Date(),
          null: null,
        }),
      );
      await assert.isFulfilled(collection.insertAsync({}));
    });
  });

  describe("objects with a catchall", function () {
    it("accepts extra fields that match the specified type", async function () {
      const schema = z
        .object({
          _id: z.string(),
          foo: z.string(),
        })
        // It seems like catchall should not need to include the types of fields
        // declared in the object, but because of how the types are currently
        // written, it is intersected with the object type. I think this is a
        // bug in zod (not in the json-schema generation)
        .catchall(z.string().or(z.number()));
      const collection = await createTestCollection(schema);

      await assert.isFulfilled(collection.insertAsync({ foo: "bar", baz: 1 }));

      await assert.isRejected(
        collection.insertAsync({ foo: "bar", baz: true } as any),
        /Document failed validation/,
      );
    });
  });

  describe("objects with passthrough", function () {
    it("accepts extra fields of any type", async function () {
      const schema = z
        .object({
          _id: z.string(),
          foo: z.string(),
        })
        .passthrough();
      const collection = await createTestCollection(schema);

      await assert.isFulfilled(
        collection.insertAsync({ foo: "bar", baz: 1 } as any),
      );
      await assert.isFulfilled(
        collection.insertAsync({ foo: "bar", baz: true } as any),
      );
    });
  });

  describe("string fields", function () {
    it("respects checks on strings", async function () {
      const schema = z.object({
        _id: z.string(),
        minLength: z.string().min(3).optional(),
        maxLength: z.string().max(3).optional(),
        fixedLength: z.string().length(3).optional(),
        pattern: z
          .string()
          .regex(/^[a-z]+$/)
          .optional(),
        email: z.string().email().optional(),
        uuid: z.string().uuid().optional(),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ minLength: "a" }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ minLength: "abcdef" }));

      await assert.isRejected(
        collection.insertAsync({ maxLength: "abcd" }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ maxLength: "ab" }));

      await assert.isRejected(
        collection.insertAsync({ fixedLength: "ab" }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ fixedLength: "abc" }));

      await assert.isRejected(
        collection.insertAsync({ pattern: "123" }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ pattern: "abc" }));

      await assert.isRejected(
        collection.insertAsync({ email: "foo" }),
        /Document failed validation/,
      );
      await assert.isFulfilled(
        collection.insertAsync({ email: "jolly-roger@deathandmayhem.com" }),
      );

      await assert.isRejected(
        collection.insertAsync({ uuid: "foo" }),
        /Document failed validation/,
      );
      await assert.isFulfilled(
        collection.insertAsync({
          uuid: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        }),
      );
    });

    it("respects strings with multiple checks", async function () {
      const schema = z.object({
        _id: z.string(),
        string: z
          .string()
          .min(3)
          .max(5)
          .regex(/^[a-z]+$/),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ string: "a" }),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ string: "abcdef" }),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ string: "123" }),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ string: "abcd" }));
    });

    it("allows strings with multiple regex checks", async function () {
      const schema = z.object({
        _id: z.string(),
        string: z
          .string()
          .regex(/^[a-z]+$/)
          .regex(/^[a-z]{3}$/),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ string: "a" }),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ string: "abcd" }),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ string: "abc" }));
    });

    it("is reasonably accepting of URLs", async function () {
      const schema = z.object({
        _id: z.string(),
        url: z.string().url(),
      });
      const collection = await createTestCollection(schema);

      await assert.isFulfilled(
        collection.insertAsync({
          url: "https://puzzlefactory.place/factory-floor",
        }),
      );
      await assert.isFulfilled(
        collection.insertAsync({ url: "https://perpendicular.institute" }),
      );
      await assert.isFulfilled(
        collection.insertAsync({ url: "https://www.bookspace.world/" }),
      );
      await assert.isFulfilled(
        collection.insertAsync({
          url: "https://www.pandamagazine.com/island9/",
        }),
      );
    });

    it("rejects unsupported checks", function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().startsWith("a").optional(),
      });
      assert.throws(
        () => generateJsonSchema(schema),
        /Unsupported string check/,
      );
    });
  });

  describe("number fields", function () {
    it("respects checks on numbers", async function () {
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

      await assert.isRejected(
        collection.insertAsync({ exclusiveMin: 3 }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ exclusiveMin: 4 }));
      await assert.isFulfilled(collection.insertAsync({ exclusiveMin: 3.5 }));

      await assert.isRejected(
        collection.insertAsync({ exclusiveMax: 3 }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ exclusiveMax: 2 }));
      await assert.isFulfilled(collection.insertAsync({ exclusiveMax: 2.5 }));

      await assert.isRejected(
        collection.insertAsync({ inclusiveMin: 2 }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ inclusiveMin: 3 }));

      await assert.isRejected(
        collection.insertAsync({ inclusiveMax: 4 }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ inclusiveMax: 3 }));

      await assert.isRejected(
        collection.insertAsync({ integer: 3.5 }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ integer: 3 }));

      await assert.isRejected(
        collection.insertAsync({ multipleOf: 4 }),
        /Document failed validation/,
      );
      await assert.isFulfilled(collection.insertAsync({ multipleOf: 6 }));
    });

    it("respects numbers with multiple checks", async function () {
      const schema = z.object({
        _id: z.string(),
        number: z.number().gt(3).lt(10).multipleOf(2),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ number: 3 }),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ number: 10 }),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ number: 4 }));
      await assert.isFulfilled(collection.insertAsync({ number: 6 }));
    });

    it("rejects unsupported checks", function () {
      const schema = z.object({
        _id: z.string(),
        number: z.number().finite(),
      });
      assert.throws(
        () => generateJsonSchema(schema),
        /Unsupported number check/,
      );
    });
  });

  describe("enum fields", function () {
    it("supports zod enums", async function () {
      const schema = z.object({
        _id: z.string(),
        enum: z.enum(["foo", "bar"]),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ enum: "baz" } as any),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ enum: "foo" }));
    });

    it("supports TypeScript-native enums", async function () {
      enum Enum {
        foo,
        bar,
      }
      const schema = z.object({
        _id: z.string(),
        enum: z.nativeEnum(Enum),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ enum: "baz" } as any),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ enum: Enum.foo }));
    });

    it("supports a union of literals", async function () {
      // We used to do this with io-ts. We'd probably prefer z.enum instead, but
      // it's nice to know if this still works.
      const schema = z.object({
        _id: z.string(),
        enum: z.literal("foo").or(z.literal("bar")),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ enum: "baz" } as any),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ enum: "foo" }));
    });
  });

  describe("fields with default values", function () {
    it("supports both a default and an explicit value", async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().default("foo"),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ string: 1 } as any),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ string: "bar" }));
      await assert.isFulfilled(collection.insertAsync({} as any));
    });
  });

  describe("array fields", function () {
    it("supports simple arrays", async function () {
      const schema = z.object({
        _id: z.string(),
        array: z.array(z.string()),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ array: "foo" } as any),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ array: [1, 2, 3] } as any),
        /Document failed validation/,
      );

      await assert.isFulfilled(
        collection.insertAsync({ array: ["foo", "bar"] }),
      );
    });

    it("supports array of unions", async function () {
      const schema = z.object({
        _id: z.string(),
        array: z.array(z.string().or(z.number())),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ array: [true, null] } as any),
        /Document failed validation/,
      );

      await assert.isFulfilled(
        collection.insertAsync({ array: ["foo", "bar"] }),
      );
      await assert.isFulfilled(collection.insertAsync({ array: [1, 2, 3] }));
      await assert.isFulfilled(
        collection.insertAsync({ array: ["foo", 1, "bar", 2, 3] }),
      );
    });
  });

  describe("top-level unions", function () {
    it("accepts objects that match either schema", async function () {
      const schema = z
        .object({
          _id: z.string(),
          foo: z.string(),
        })
        .or(
          z.object({
            _id: z.string(),
            bar: z.number(),
          }),
        );
      const collection = await createTestCollection(schema);

      await assert.isFulfilled(collection.insertAsync({ foo: "foo" }));
      await assert.isFulfilled(collection.insertAsync({ bar: 1 }));

      await assert.isRejected(
        collection.insertAsync({ foo: "foo", bar: 1 }),
        /Document failed validation/,
      );
    });
  });

  describe("top-level discriminated unions", function () {
    it("accepts objects that match either schema", async function () {
      const schema = z.discriminatedUnion("type", [
        z.object({
          _id: z.string(),
          type: z.literal("foo"),
          foo: z.string(),
        }),
        z.object({
          _id: z.string(),
          type: z.literal("bar"),
          bar: z.number(),
        }),
      ]);
      const collection = await createTestCollection(schema);

      await assert.isFulfilled(
        collection.insertAsync({ type: "foo", foo: "foo" }),
      );
      await assert.isFulfilled(collection.insertAsync({ type: "bar", bar: 1 }));

      await assert.isRejected(
        collection.insertAsync({ type: "foo", foo: "foo", bar: 1 } as any),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ type: "foo", bar: 1 } as any),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ type: "bar", foo: "foo" } as any),
        /Document failed validation/,
      );
    });
  });

  describe("top-level intersections", function () {
    it("only accepts objects that match both schemas", async function () {
      const schema = z
        .object({
          _id: z.string(),
          foo: z.string(),
        })
        .and(
          z.object({
            bar: z.number(),
          }),
        );
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ foo: "foo" } as any),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ bar: 1 } as any),
        /Document failed validation/,
      );

      await assert.isFulfilled(collection.insertAsync({ foo: "foo", bar: 1 }));
    });
  });

  describe("intersections of scalar types", function () {
    it("only accepts objects that match both schemas", async function () {
      const schema = z.object({
        _id: z.string(),
        string: z.string().email().and(z.string().min(10)),
      });
      const collection = await createTestCollection(schema);

      await assert.isRejected(
        collection.insertAsync({ string: "foo" }),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ string: "foo@bar" }),
        /Document failed validation/,
      );
      await assert.isRejected(
        collection.insertAsync({ string: "a@b.co" }),
        /Document failed validation/,
      );

      await assert.isFulfilled(
        collection.insertAsync({ string: "jolly-roger@deathandmayhem.com" }),
      );
    });
  });
});
