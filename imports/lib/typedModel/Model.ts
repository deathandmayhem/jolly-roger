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
  type AutoPopulatedKeys,
  collectSchemaMetadata,
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
// Keys that have a Zod .default() — optional in input but required in output
type DefaultKeys<S extends z.ZodType> = {
  [K in keyof input<S> & keyof output<S>]: undefined extends input<S>[K]
    ? undefined extends output<S>[K]
      ? never
      : K
    : never;
}[keyof input<S> & keyof output<S>];

type OptionalInsertKeys<S extends z.ZodType> =
  | (AutoPopulatedKeys<input<S>> & keyof output<S>)
  | DefaultKeys<S>;

export type InsertModelType<S extends z.ZodType> = util.Flatten<
  Omit<output<S>, OptionalInsertKeys<S>> &
    Partial<Pick<output<S>, OptionalInsertKeys<S>>>
>;

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
  defaults: Record<string, unknown>;
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
          result[auto.when][key] = this.collection._makeNewID();
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
          // biome-ignore lint: exhaustive switch
          auto.value satisfies never;
      }
    }

    return result;
  }

  async insertAsync(
    doc: InsertModelType<SchemaWithId<Schema, IdSchema>>,
  ): Promise<output<IdSchema>> {
    const autoPopulated = this.autoPopulatedFields();
    const finalDoc = {
      ...this.defaults,
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
    const isReplacement = !Object.keys(mod).some((key) => key.startsWith("$"));
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
      // For non-replacements, we put insert fields into $setOnInsert, and update
      // and always fields into $set
      finalMod = {
        ...mod,
        $setOnInsert: {
          ...this.defaults,
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
    return this.collection.find(selector, options) as Mongo.Cursor<
      SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S>
    >;
  }

  findOne<const S extends Selector<output<SchemaWithId<Schema, IdSchema>>>>(
    selector?: S,
    options?: Omit<Mongo.Options<any>, "transform">,
  ):
    | SelectorToResultType<output<SchemaWithId<Schema, IdSchema>>, S>
    | undefined {
    return this.collection.findOne(selector, options) as
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
    return this.collection.findOneAsync(selector, options) as Promise<
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
