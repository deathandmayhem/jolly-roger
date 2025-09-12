import { Mongo } from "meteor/mongo";
import { z } from "zod";
import type { ModelType, Selector, SelectorToResultType } from "./Model";
import Model from "./Model";
import type { stringId } from "./customTypes";
import { deleted } from "./customTypes";
import type { MongoRecordZodType } from "./generateJsonSchema";

const injectQuery = <S extends Mongo.Selector<any>>(
  selector: S | string | Mongo.ObjectID | undefined,
  injection: S,
) => {
  if (!selector) {
    return injection;
  }
  if (typeof selector === "string") {
    return { _id: selector, ...injection };
  }
  if (selector instanceof Mongo.ObjectID) {
    return { _id: selector, ...injection };
  }
  if ("$query" in selector) {
    return {
      ...selector,
      $query: {
        $and: [selector.$query, injection],
      },
    };
  }

  return {
    $and: [selector, injection],
  };
};

const injectOptions = <Opts extends Mongo.Options<any>>(
  options: Opts | undefined,
) => {
  if (options?.projection) {
    return {
      ...options,
      projection: {
        ...options.projection,
        deleted: 1,
      },
    };
  }

  return options;
};

class SoftDeletedModel<
  Schema extends MongoRecordZodType,
  IdSchema extends z.ZodTypeAny = typeof stringId,
> extends Model<
  Schema extends z.ZodObject<
    infer Shape extends z.ZodRawShape,
    infer UnknownKeys,
    infer Catchall
  >
    ? z.ZodObject<
        z.objectUtil.extendShape<Shape, { deleted: typeof deleted }>,
        UnknownKeys,
        Catchall
      >
    : z.ZodIntersection<Schema, z.ZodObject<{ deleted: typeof deleted }>>,
  IdSchema
> {
  constructor(name: string, schema: Schema, idSchema?: IdSchema) {
    super(
      name,
      schema instanceof z.ZodObject
        ? schema.extend({ deleted })
        : (schema.and(z.object({ deleted })) as any),
      idSchema,
    );
  }

  destroyAsync(selector: Selector<ModelType<this>>): Promise<number> {
    return this.updateAsync(selector, { $set: { deleted: true } } as any, {
      multi: true,
    });
  }

  undestroyAsync(selector: Selector<ModelType<this>>): Promise<number> {
    return this.updateAsync(selector, { $set: { deleted: false } } as any, {
      multi: true,
    });
  }

  find<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "transform">,
  >(
    selector?: S,
    options?: O,
  ): Mongo.Cursor<SelectorToResultType<ModelType<this>, S>> {
    return super.find(
      injectQuery(selector, { deleted: false }) as any,
      injectOptions(options),
    ) as any;
  }

  findOne<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "limit" | "transform">,
  >(
    selector?: S,
    options?: O,
  ): SelectorToResultType<ModelType<this>, S> | undefined {
    return super.findOne(
      injectQuery(selector, { deleted: false }) as any,
      injectOptions(options),
    ) as any;
  }

  findOneAsync<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "limit" | "transform">,
  >(
    selector?: S,
    options?: O,
  ): Promise<SelectorToResultType<ModelType<this>, S> | undefined> {
    return super.findOneAsync(
      injectQuery(selector, { deleted: false }) as any,
      injectOptions(options),
    ) as any;
  }

  findAllowingDeleted<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "transform">,
  >(selector?: S, options?: O) {
    return super.find(selector, injectOptions(options));
  }

  findOneAllowingDeleted<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "limit" | "transform">,
  >(selector?: S, options?: O) {
    return super.findOne(selector, injectOptions(options));
  }

  findOneAllowingDeletedAsync<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "limit" | "transform">,
  >(selector?: S, options?: O) {
    return super.findOneAsync(selector, injectOptions(options));
  }

  findDeleted<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "transform">,
  >(
    selector?: S,
    options?: O,
  ): Mongo.Cursor<SelectorToResultType<ModelType<this>, S>> {
    return super.find(
      injectQuery(selector, { deleted: true }) as any,
      injectOptions(options),
    ) as any;
  }

  findOneDeleted<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "limit" | "transform">,
  >(
    selector?: S,
    options?: O,
  ): SelectorToResultType<ModelType<this>, S> | undefined {
    return super.findOne(
      injectQuery(selector, { deleted: true }) as any,
      injectOptions(options),
    ) as any;
  }

  findOneDeletedAsync<
    S extends Selector<ModelType<this>>,
    O extends Omit<Mongo.Options<ModelType<this>>, "limit" | "transform">,
  >(
    selector?: S,
    options?: O,
  ): Promise<SelectorToResultType<ModelType<this>, S> | undefined> {
    return super.findOneAsync(
      injectQuery(selector, { deleted: true }) as any,
      injectOptions(options),
    ) as any;
  }
}

export default SoftDeletedModel;
