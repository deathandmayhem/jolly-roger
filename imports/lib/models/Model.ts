import { Mongo, MongoInternals } from 'meteor/mongo';
import type { Document, IndexSpecification, CreateIndexesOptions } from 'mongodb';
import { z } from 'zod';
import {
  IsInsert, IsUpdate, IsUpsert, stringId,
} from '../schemas/customTypes';
import type { MongoRecordZodType } from '../schemas/generateJsonSchema';
import validateSchema from './validateSchema';

export type Selector<T extends Document> = Mongo.Selector<T> | string | Mongo.ObjectID;
export type SelectorToResultType<T extends Document, S extends Selector<T>> =
  S extends string ? T & { _id: S } :
  S extends Mongo.ObjectID ? T & { _id: S } :
  z.objectUtil.flatten<T & { [K in keyof S & keyof T]: S[K] extends T[K] ? S[K] : never }>;

// Walk the schema and adjust the schema to match an update operation (not the
// top-level, but the individual objects on $set or similar). This means
// changing defaults into transforms that are only applied on inserts and
// upserts and relaxing most constraints on container types - make everything
// optional, remove length requirements on arrays, etc, but leave effects and
// constraints on scalars in place. This matches what we need to parse (and
// potentially apply transforms to) an update modifier.
//
// It's OK if any of these would accept _more_ than Mongo would accept, so long
// as they accept _at least_ what Mongo would accept.
export function relaxSchema(schema: z.ZodFirstPartySchemaTypes): z.ZodTypeAny {
  const { _def: def } = schema;
  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const newShape: any = {};
      for (const [key, fieldSchemaUnknown] of Object.entries(def.shape())) {
        const fieldSchema = fieldSchemaUnknown as z.ZodTypeAny;
        newShape[key] = relaxSchema(fieldSchema);
      }
      return z.object(newShape).passthrough().optional();
    }
    case z.ZodFirstPartyTypeKind.ZodArray:
      // Depending on how we're manipulating the array, it can either be:
      // - A record of stringified numbers to elements (not actually, but this
      //   is what we end up with from getSchemaForField)
      // - An object with an $each field mapping to an array (for $push)
      // - An array (for $set)
      // - A single element (for $push)
      //
      // (Note that order here matters - zod will accept the first schema that
      // matches)
      return z.union([
        z.record(z.coerce.number(), relaxSchema(def.type)).optional(),
        z.object({ $each: z.array(relaxSchema(def.type)) }).passthrough().optional(),
        relaxSchema(def.type).optional(),
        z.array(relaxSchema(def.type)).optional(),
      ]).optional();
    case z.ZodFirstPartyTypeKind.ZodUnion:
      return z.union(def.options.map(relaxSchema)).optional();
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return z.union(def.options.map(relaxSchema)).optional();
    case z.ZodFirstPartyTypeKind.ZodIntersection:
      return z.intersection(relaxSchema(def.left), relaxSchema(def.right)).optional();
    case z.ZodFirstPartyTypeKind.ZodTuple:
      return z.tuple(def.items.map(relaxSchema)).optional();
    case z.ZodFirstPartyTypeKind.ZodRecord:
      return z.record(def.keyType, relaxSchema(def.valueType)).optional();
    case z.ZodFirstPartyTypeKind.ZodDefault: {
      const { defaultValue, innerType } = def;
      return innerType.optional().transform((v: z.output<typeof innerType>) => {
        if (v) return v;
        if (IsInsert.getOrNullIfOutsideFiber() || IsUpsert.getOrNullIfOutsideFiber()) {
          return defaultValue();
        }
        return undefined;
      });
    }
    default:
      return schema.isOptional() ? schema : schema.optional();
  }
}

export function flattenSchemas<Schemas extends z.ZodTypeAny[]>(schemas: Schemas): z.ZodTypeAny {
  const [first, second, ...rest] = schemas.filter((s) => !(s instanceof z.ZodNever));
  if (!first) {
    return z.never();
  }

  if (!second) {
    return first;
  }

  return z.union([first, second, ...rest]);
}

export function getSchemaForField<Schema extends z.ZodTypeAny>(
  schema: Schema,
  field: string,
): z.ZodTypeAny {
  const { _def: def } = schema;
  switch (def.typeName) {
    case z.ZodFirstPartyTypeKind.ZodObject:
      if (field in def.shape()) {
        return def.shape()[field];
      }
      return z.never();
    case z.ZodFirstPartyTypeKind.ZodUnion:
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return flattenSchemas(def.options.flatMap(<T extends z.ZodTypeAny>(option: T) => {
        return getSchemaForField(option, field);
      }));
    case z.ZodFirstPartyTypeKind.ZodIntersection:
      return flattenSchemas([def.left, def.right].flatMap(<T extends z.ZodTypeAny>(option: T) => {
        return getSchemaForField(option, field);
      }));
    case z.ZodFirstPartyTypeKind.ZodTuple: {
      let index;
      try {
        index = parseInt(field, 10);
      } catch (e) {
        return z.never();
      }
      return def.items[index] ?? z.never();
    }
    case z.ZodFirstPartyTypeKind.ZodArray: {
      try {
        parseInt(field, 10);
        // if the field is a number, it's a valid array index
        return def.type;
      } catch (e) {
        return z.never();
      }
    }
    case z.ZodFirstPartyTypeKind.ZodRecord:
      if (def.keyType.safeParse(field).success) {
        return def.valueType;
      } else {
        return z.never();
      }
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return getSchemaForField(def.innerType, field);
    default:
      throw new Error(`Unable to traverse schema type ${def.typeName}`);
  }
}

export async function parseMongoOperationAsync(
  relaxedSchema: z.ZodTypeAny,
  operation: Record<string, any>,
  parsed: Record<string, any> = {},
  pathParts: string[] = []
): Promise<any> {
  // The basic strategy is to:
  // - Pull out keys from operation that are not dot-separated
  // - Attempt to partial-ify the schema and apply it to just those keys
  // - Prefix the keys with pathParts
  // - Group dot-separated keys by the first part
  // - Recurse on each group

  const dotSeparatedKeys: Record<string, any> = {};
  const nonDotSeparatedKeys: Record<string, Record<string, any>> = {};
  for (const [key, value] of Object.entries(operation)) {
    const [prefix, next, ...rest] = key.split('.');
    if (prefix && next) {
      dotSeparatedKeys[prefix] = dotSeparatedKeys[prefix] || {};
      dotSeparatedKeys[prefix][[next, ...rest].join('.')] = value;
    } else {
      nonDotSeparatedKeys[key] = value;
    }
  }

  const parsedNonDotSeparatedKeys = await relaxedSchema.parseAsync(nonDotSeparatedKeys);
  for (const [key, value] of Object.entries(parsedNonDotSeparatedKeys)) {
    parsed[pathParts.concat(key).join('.')] = value;
  }

  for (const [prefix, suboperation] of Object.entries(dotSeparatedKeys)) {
    const subschema = getSchemaForField(relaxedSchema, prefix);
    await parseMongoOperationAsync(subschema, suboperation, parsed, pathParts.concat(prefix));
  }

  return parsed;
}

const modifierIsWholeDoc = <T extends Document>(modifier: Mongo.Modifier<T>): modifier is T => {
  const keys = Object.keys(modifier);
  return keys.length > 0 && !keys.some((k) => k.startsWith('$'));
};

export async function parseMongoModifierAsync<Schema extends MongoRecordZodType>(
  relaxedSchema: Schema,
  modifier: Mongo.Modifier<z.input<Schema>>,
  upsert: boolean,
): Promise<Mongo.Modifier<z.output<Schema>>> {
  // Types should prevent passing a full document as a modifier to
  // {update,upsert}Async, but verify at runtime to be sure
  if (modifierIsWholeDoc(modifier)) {
    throw new Error('Cannot pass a full document as a modifier');
  }

  const parsed: any = {
    $set: await IsUpdate.withValue(!upsert, () => {
      return parseMongoOperationAsync(relaxedSchema, modifier.$set ?? {});
    }),
    $setOnInsert: await IsUpsert.withValue(true, () => {
      return parseMongoOperationAsync(relaxedSchema, modifier.$setOnInsert ?? {});
    }),
  };

  for (const [key, value] of Object.entries(modifier)) {
    switch (key) {
      case '$set':
      case '$setOnInsert':
        // we already handled these
        break;
      case '$push':
      case '$addToSet':
      case '$pull':
      case '$pullAll':
      case '$inc':
      case '$min':
      case '$max':
      case '$mul':
        parsed[key] = await parseMongoOperationAsync(relaxedSchema, value);
        break;
      case '$unset':
        // we can't do anything with these, so rely on the json-schema to
        // validate
        parsed[key] = value;
        break;
      default:
        throw new Error(`Unknown modifier ${key}`);
    }
  }

  // de-conflict $set and $setOnInsert
  if ('$set' in parsed && '$setOnInsert' in parsed) {
    for (const key of Object.keys(parsed.$setOnInsert)) {
      if (key in parsed.$set) {
        delete parsed.$setOnInsert[key];
      }
    }
  }

  // remove empty operations
  if (Object.keys(parsed.$set).length === 0) {
    delete parsed.$set;
  }
  if (Object.keys(parsed.$setOnInsert).length === 0) {
    delete parsed.$setOnInsert;
  }

  return parsed;
}

// When we get a validation error, stringify the schema error message and tack
// it onto both the message and the first line of the stack trace so it's easier
// to find.
export function formatValidationError(error: unknown) {
  const { MongoError } = MongoInternals.NpmModules.mongodb.module;

  if (!(error instanceof MongoError)) {
    return;
  }

  if (error.code !== 121 /* DocumentValidationFailure */) {
    return;
  }

  if (!('errInfo' in error) ||
    !error.errInfo ||
    typeof error.errInfo !== 'object' ||
    !('details' in error.errInfo) ||
    !error.errInfo.details ||
    typeof error.errInfo.details !== 'object' ||
    !('schemaRulesNotSatisfied' in error.errInfo.details) ||
    !Array.isArray(error.errInfo.details.schemaRulesNotSatisfied)) {
    return;
  }

  error.message += `: ${JSON.stringify(error.errInfo.details.schemaRulesNotSatisfied)}`;
  error.stack = error.stack?.replace(/^.*$/m, error.message);
}

export const AllModels = new Set<Model<any>>();

class Model<Schema extends MongoRecordZodType> {
  name: string;

  schema: Schema extends z.ZodObject<infer Shape, infer UnknownKeys, infer Catchall> ?
    z.ZodObject<z.extendShape<Shape, { _id: typeof stringId }>, UnknownKeys, Catchall> :
    z.ZodIntersection<Schema, z.ZodObject<{ _id: typeof stringId }>>;

  relaxedSchema: z.ZodTypeAny;

  collection: Mongo.Collection<z.output<this['schema']>>;

  constructor(name: string, schema: Schema) {
    this.schema = schema instanceof z.ZodObject ?
      schema.extend({ _id: stringId }) :
      schema.and(z.object({ _id: stringId })) as any;
    validateSchema(this.schema);
    this.name = name;
    this.relaxedSchema = relaxSchema(this.schema);
    this.collection = new Mongo.Collection(name);
  }

  async insertAsync(doc: z.input<this['schema']>, options: {
    bypassSchema?: boolean | undefined;
  } = {}): Promise<z.output<typeof stringId>> {
    const { bypassSchema } = options;
    if (bypassSchema) {
      let raw: any = doc;
      if (!('_id' in doc)) {
        raw = { ...doc, _id: this.collection._makeNewID() };
      }
      try {
        await this.collection.rawCollection()
          .insertOne(raw, { bypassDocumentValidation: true });
        return raw._id;
      } catch (e) {
        formatValidationError(e);
        throw e;
      }
    }

    const parsed: z.output<Schema> = await IsInsert.withValue(true, async () => {
      return this.schema.parseAsync(doc);
    });
    try {
      return await this.collection.insertAsync(parsed);
    } catch (e) {
      formatValidationError(e);
      throw e;
    }
  }

  // As a note, we don't accept full documents as modifiers because our
  // transform functions don't make sense (e.g. we won't accept a `createdAt`
  // timestamp, but we expect one to be there)
  async updateAsync(
    selector: Selector<z.output<this['schema']>>,
    modifier: Exclude<Mongo.Modifier<z.input<this['schema']>>, z.input<this['schema']>>,
    options: {
      multi?: boolean | undefined;
      upsert?: boolean | undefined;
      arrayFilters?: { [identifier: string]: any }[] | undefined;
      bypassSchema?: boolean | undefined;
    } = {},
  ): Promise<number> {
    const { bypassSchema = false, ...mongoOptions } = options;

    // Note that Meteor's update implementation will drop options that it
    // doesn't recognize (including bypassDocumentValidation), so we need to go
    // around it and do some of its work ourselves.
    //
    // However, Meteor tries pretty hard to make sure its ID generation scheme
    // behaves correctly in the presence of upserts, and that's too much work to
    // do ourselves, so ban upserts with bypassSchema. The behavior can be
    // replicated easily enough by trying to insert, and falling back on an
    // update if that fails.
    if (bypassSchema) {
      if (options.upsert) {
        throw new Error('Cannot bypass schema validation when upserting');
      }

      try {
        const result = await this.collection.rawCollection().updateOne(
          typeof selector === 'object' ? selector : { _id: selector },
          modifier,
          {
            ...mongoOptions,
            bypassDocumentValidation: true,
          } as any
        );
        return result.modifiedCount;
      } catch (e) {
        formatValidationError(e);
        throw e;
      }
    }

    const parsed = await parseMongoModifierAsync(this.relaxedSchema, modifier, !!options.upsert);
    try {
      return await this.collection.updateAsync(selector, parsed, mongoOptions);
    } catch (e) {
      formatValidationError(e);
      throw e;
    }
  }

  // See the comments around bypassSchema in updateAsync for why we don't
  // support bypassSchema here
  async upsertAsync(
    selector: Selector<z.output<this['schema']>>,
    modifier: Exclude<Mongo.Modifier<z.output<this['schema']>>, z.output<this['schema']>>,
    options: {
      multi?: boolean | undefined;
    } = {},
  ): Promise<{
    numberAffected?: number | undefined;
    insertedId?: z.output<typeof stringId> | undefined;
  }> {
    const parsed = await parseMongoModifierAsync(this.relaxedSchema, modifier, true);
    try {
      return await this.collection.upsertAsync(selector, parsed, options) as any;
    } catch (e) {
      formatValidationError(e);
      throw e;
    }
  }

  async removeAsync(
    selector: Selector<z.output<this['schema']>>,
  ): Promise<number> {
    return this.collection.removeAsync(selector);
  }

  // For now, don't allow transforms on query methods. There's no fundamental
  // reason not to, but I wasn't able to get the types to work

  find<
    S extends Selector<z.output<this['schema']>>,
    O extends Omit<Mongo.Options<z.output<this['schema']>>, 'transform'>,
  >(
    selector?: S,
    options?: O,
  ) {
    return this.collection.find(selector, options) as
      Mongo.Cursor<SelectorToResultType<z.output<this['schema']>, S>>;
  }

  findOne<S extends Selector<z.output<this['schema']>>, O extends Omit<Mongo.Options<z.output<this['schema']>>, 'limit' | 'transform'>>(
    selector?: S,
    options?: O,
  ) {
    return this.collection.findOne(selector, options) as
      SelectorToResultType<z.output<this['schema']>, S> | undefined;
  }

  findOneAsync<S extends Selector<z.output<this['schema']>>, O extends Omit<Mongo.Options<z.output<this['schema']>>, 'limit' | 'transform'>>(
    selector?: S,
    options?: O,
  ) {
    return this.collection.findOneAsync(selector, options) as
      Promise<SelectorToResultType<z.output<this['schema']>, S> | undefined>;
  }

  createIndexAsync(
    keys: IndexSpecification,
    options?: CreateIndexesOptions,
  ): Promise<void> {
    return this.collection.createIndexAsync(keys, options);
  }

  async dropIndexAsync(
    name: string,
  ): Promise<void> {
    // _dropIndex is not idempotent, so we need to figure out if the
    // index already exists
    const collection = this.collection.rawCollection();
    if (await collection.indexExists(name)) {
      await collection.dropIndex(name);
    }
  }
}

export type ModelType<M extends Model<any>> = z.output<M['schema']>;

export default Model;