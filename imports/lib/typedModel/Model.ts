import { DDP } from "meteor/ddp";
import { Meteor } from "meteor/meteor";
import { Mongo } from "meteor/mongo";
import { NpmModuleMongodb } from "meteor/npm-mongo";
import { z } from "zod";
import type {
  $ZodObjectConfig,
  $ZodShape,
  input,
  output,
  util,
} from "zod/v4/core";
import {
  type AutoPopulate,
  collectSchemaMetadata,
  type IsAutoPopulated,
} from "./autoPopulate";
import { stringId } from "./customTypes";
import {
  type IndexOptions,
  type IndexSpecification,
  type ModelIndexSpecification,
  normalizeIndexOptions,
  normalizeIndexSpecification,
} from "./indexes";
import validateSchema from "./validateSchema";

export type SchemaWithId<
  Schema extends z.ZodType,
  IdSchema extends z.ZodType<string> = typeof stringId,
> =
  Schema extends z.ZodObject<
    infer Shape extends $ZodShape,
    infer Config extends $ZodObjectConfig
  >
    ? z.ZodObject<util.Extend<Shape, { _id: IdSchema }>, Config>
    : z.ZodIntersection<Schema, z.ZodObject<{ _id: IdSchema }>>;

export type ModelType<M extends { _docType: unknown }> = M["_docType"];
// The value a key can take across the members of a (possibly union) input
// type; distributes so that variant-specific keys resolve to whichever
// variant declares them
type InputProp<I, K> = I extends any
  ? K extends keyof I
    ? I[K]
    : never
  : never;

// Keys that are optional at insertion time: auto-populated fields (branded on
// the input side) and fields with a Zod .default() (optional in input but
// required in output). Computed against a single member O of the output type
type OptionalInsertKeys<I, O> = {
  [K in keyof O]: [InputProp<I, K>] extends [never]
    ? never
    : IsAutoPopulated<InputProp<I, K>> extends true
      ? K
      : undefined extends InputProp<I, K>
        ? undefined extends O[K]
          ? never
          : K
        : never;
}[keyof O];

type InsertMember<I, O> = util.Flatten<
  Omit<O, OptionalInsertKeys<I, O>> & Partial<Pick<O, OptionalInsertKeys<I, O>>>
>;

// Distribute over the members of a union output so that variant-specific
// fields survive (Omit over a union would collapse it to its common keys)
export type InsertModelType<S extends z.ZodType> =
  output<S> extends infer O
    ? O extends any
      ? InsertMember<input<S>, O>
      : never
    : never;

export type Selector<T> = Mongo.Selector<T> | string;
// Given a query, attempt to compute what the result of that query must be.
// Primarily intended to be useful for discriminated unions, so it does not
// attempt to fully resolve all cases.
export type SelectorToResultType<T, S extends Selector<T>> = S extends string
  ? T & { _id: S }
  : util.Flatten<
      T & { [K in keyof S & keyof T as S[K] extends T[K] ? K : never]: S[K] }
    >;

// Allow overriding time for testing
let clock: () => Date;
export function setClock(newClock: () => Date) {
  clock = newClock;
}
export function resetClock() {
  clock = () => new Date();
}
resetClock();

// When we get a validation error, stringify the schema error message and tack
// it onto both the message and the first line of the stack trace so it's easier
// to find.
export function formatValidationError(error: unknown) {
  const { MongoError } = NpmModuleMongodb;

  if (!(error instanceof MongoError)) {
    return;
  }

  if (error.code !== 121 /* DocumentValidationFailure */) {
    return;
  }

  if (
    !("errInfo" in error) ||
    !error.errInfo ||
    typeof error.errInfo !== "object" ||
    !("details" in error.errInfo) ||
    !error.errInfo.details ||
    typeof error.errInfo.details !== "object" ||
    !("schemaRulesNotSatisfied" in error.errInfo.details) ||
    !Array.isArray(error.errInfo.details.schemaRulesNotSatisfied)
  ) {
    return;
  }

  error.message += `: ${JSON.stringify(
    error.errInfo.details.schemaRulesNotSatisfied,
  )}`;
  error.stack = error.stack?.replace(/^.*$/m, error.message);
}

export const AllModels = new Set<Model<any, any>>();

class Model<
  Schema extends z.ZodType,
  IdSchema extends z.ZodType<string> = typeof stringId,
> {
  declare _docType: output<SchemaWithId<Schema, IdSchema>>;
  schema: SchemaWithId<Schema, IdSchema>;
  collection: Mongo.Collection<output<SchemaWithId<Schema, IdSchema>>>;
  autoPopulated: Record<string, AutoPopulate>;
  defaults: Record<string, () => unknown>;
  indexes: ModelIndexSpecification[] = [];

  constructor(
    public name: string,
    inputSchema: Schema,
    idSchema?: IdSchema,
  ) {
    const id = idSchema ?? stringId;
    const merged =
      inputSchema instanceof z.ZodObject
        ? inputSchema.extend({ _id: id })
        : inputSchema.and(z.object({ _id: id }));
    this.schema = merged as any;
    validateSchema(this.schema);
    this.collection = new Mongo.Collection(name);
    const metadata = collectSchemaMetadata(this.schema);
    this.autoPopulated = metadata.autoPopulated;
    this.defaults = metadata.defaults;
    AllModels.add(this);
  }

  autoPopulatedFields(): Record<AutoPopulate["when"], Record<string, unknown>> {
    const now = clock();

    const result: Record<AutoPopulate["when"], Record<string, unknown>> = {
      insert: {},
      update: {},
      always: {},
    };

    for (const [key, auto] of Object.entries(this.autoPopulated)) {
      switch (auto.value) {
        case "timestamp":
          result[auto.when][key] = now;
          break;
        case "id":
          // We don't generate a value here because Meteor already generates
          // _id itself at insert time, and generating one in a modifier's
          // $setOnInsert conflicts with upserts whose selector pins _id. Any
          // other id-typed field is the caller's responsibility (and Mongo's
          // schema enforcement will verify it's present).
          break;
        case "userId":
          // Calling Meteor.userId outside of a method or publication is an
          // error, so make sure we're inside one. (And trust Mongo's
          // enforcement to catch if we needed a value here)
          if (
            DDP._CurrentMethodInvocation.get() ||
            DDP._CurrentPublicationInvocation.get()
          ) {
            result[auto.when][key] = Meteor.userId();
          }
          break;
        default:
          auto.value satisfies never;
      }
    }

    return result;
  }

  defaultFields(): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(this.defaults).map(([key, value]) => [key, value()]),
    );
  }

  async insertAsync(
    doc: InsertModelType<SchemaWithId<Schema, IdSchema>>,
  ): Promise<output<IdSchema>> {
    const autoPopulated = this.autoPopulatedFields();
    const finalDoc = {
      ...this.defaultFields(),
      ...autoPopulated.insert,
      ...autoPopulated.always,
      ...doc,
    } as any;

    try {
      return (await this.collection.insertAsync(finalDoc)) as output<IdSchema>;
    } catch (error) {
      formatValidationError(error);
      throw error;
    }
  }

  autoPopulateModifier(
    mod: Mongo.Modifier<output<SchemaWithId<Schema, IdSchema>>>,
  ): any {
    // An empty modifier is a (no-op) modifier, not a replacement, so we only
    // treat mod as a replacement if it has at least one non-operator key
    const keys = Object.keys(mod);
    const isReplacement =
      keys.length > 0 && !keys.some((key) => key.startsWith("$"));
    const autoPopulated = this.autoPopulatedFields();

    let finalMod: any;

    if (isReplacement) {
      // We *don't* populate "insert" fields on replacements (since that's not
      // an insert), so the caller is responsible for making sure those fields
      // are populated (Mongo will verify). We will set "update" and "always"
      // fields, though (though they can be overridden by the caller)
      finalMod = {
        ...autoPopulated.update,
        ...autoPopulated.always,
        ...mod,
      };
    } else {
      // For non-replacements, we put insert fields into $setOnInsert, and
      // update and always fields into $set. (If this isn't an upsert, Mongo
      // ignores $setOnInsert.)
      finalMod = {
        ...mod,
        $setOnInsert: {
          ...this.defaultFields(),
          ...autoPopulated.insert,
          ...mod.$setOnInsert,
        },
        $set: {
          ...autoPopulated.update,
          ...autoPopulated.always,
          ...mod.$set,
        },
      };

      // We also need to scrub any $setOnInsert fields that show up on other
      // operators
      for (const operator of Object.keys(finalMod)) {
        if (operator === "$setOnInsert") continue;
        if (typeof finalMod[operator] !== "object") continue;

        for (const key of Object.keys(finalMod[operator])) {
          delete finalMod.$setOnInsert[key];
        }
      }

      // Drop any operators we left empty, since Mongo rejects empty atomic
      // operations
      for (const operator of ["$set", "$setOnInsert"]) {
        if (
          finalMod[operator] &&
          Object.keys(finalMod[operator]).length === 0
        ) {
          delete finalMod[operator];
        }
      }
    }

    return finalMod;
  }

  async updateAsync(
    selector: Selector<output<SchemaWithId<Schema, IdSchema>>>,
    mod: Mongo.Modifier<output<SchemaWithId<Schema, IdSchema>>>,
    options: {
      multi?: boolean | undefined;
      upsert?: boolean | undefined;
      arrayFilters?: { [identifier: string]: any }[] | undefined;
    } = {},
  ): Promise<number> {
    try {
      return await this.collection.updateAsync(
        selector,
        this.autoPopulateModifier(mod),
        options,
      );
    } catch (error) {
      formatValidationError(error);
      throw error;
    }
  }

  async upsertAsync(
    selector: Selector<output<SchemaWithId<Schema, IdSchema>>>,
    mod: Mongo.Modifier<output<SchemaWithId<Schema, IdSchema>>>,
    options: {
      multi?: boolean | undefined;
      arrayFilters?: { [identifier: string]: any }[] | undefined;
    } = {},
  ): Promise<{ numberAffected?: number; insertedId?: output<IdSchema> }> {
    try {
      return (await this.collection.upsertAsync(
        selector,
        this.autoPopulateModifier(mod),
        options,
      )) as { numberAffected?: number; insertedId?: output<IdSchema> };
    } catch (error) {
      formatValidationError(error);
      throw error;
    }
  }

  async removeAsync(
    selector: Selector<output<SchemaWithId<Schema, IdSchema>>>,
  ): Promise<number> {
    const result = await this.collection.removeAsync(selector);
    return result;
  }

  find<const S extends Selector<output<SchemaWithId<Schema, IdSchema>>>>(
    selector?: S,
    options?: Omit<Mongo.Options<any>, "transform">,
  ): Mongo.Cursor<
    SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S>
  > {
    return this.collection.find(selector ?? {}, options) as Mongo.Cursor<
      SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S>
    >;
  }

  findOne<const S extends Selector<output<SchemaWithId<Schema, IdSchema>>>>(
    selector?: S,
    options?: Omit<Mongo.Options<any>, "transform">,
  ):
    | SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S>
    | undefined {
    return this.collection.findOne(selector ?? {}, options) as
      | SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S>
      | undefined;
  }

  findOneAsync<
    const S extends Selector<output<SchemaWithId<Schema, IdSchema>>>,
  >(
    selector?: S,
    options?: Omit<Mongo.Options<any>, "transform">,
  ): Promise<
    SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S> | undefined
  > {
    return this.collection.findOneAsync(selector ?? {}, options) as Promise<
      | SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S>
      | undefined
    >;
  }

  addIndex(specification: IndexSpecification, options: IndexOptions = {}) {
    const normalizedIndex = normalizeIndexSpecification(specification);
    const normalizedOptions = normalizeIndexOptions(options);
    const stringified = JSON.stringify([normalizedIndex, normalizedOptions]);
    this.indexes.push({
      // We currently generate name here in the same way Mongo would implicitly,
      // but we will explicitly use this field's value for the index name when
      // actually creating the index, so if we want to support index name
      // overrides, we could.
      name: normalizedIndex.map(([k, v]) => `${k}_${v}`).join("_"),
      index: normalizedIndex,
      options: normalizedOptions,
      stringified,
    });
  }
}

export default Model;
