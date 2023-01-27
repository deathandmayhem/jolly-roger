import { Mongo } from 'meteor/mongo';
import type ValidateShape from '../ValidateShape';
import isAdmin from '../isAdmin';
import type { BaseType } from '../schemas/Base';
import MeteorUsers from './MeteorUsers';

const formatQuery = Symbol('formatQuery');
const formatOptions = Symbol('formatOptions');

export type FindSelector<T> = string | Mongo.ObjectID | Mongo.Selector<T>
export type FindOneOptions = {
  sort?: Mongo.SortSpecifier;
  skip?: number;
  fields?: Mongo.FieldSpecifier;
  reactive?: boolean;
}
export type FindOptions = FindOneOptions & {
  limit?: number;
}

type SelectorToResultType<T, Selector extends FindSelector<T>> =
  Selector extends string ? T & { _id: Selector } :
  Selector extends Mongo.ObjectID ? T & { _id: Selector } :
  T & { [K in keyof Selector & keyof T]: Selector[K] extends T[K] ? Selector[K] : never };

class Base<T extends BaseType> extends Mongo.Collection<T> {
  public name: string;

  public tableName: string;

  constructor(name: string, options = {}) {
    // Namespace table name in mongo
    const tableName = `jr_${name}`;
    super(tableName, options);
    this.name = name;
    this.tableName = tableName;

    // Let admins get away with absolutely anything from the client.
    // This is an affordance intended for use by a human trying to fix things
    // in production with the `Models` global manually populated by the
    // `loadFacades()` global function, and these allow rules should never be
    // relied upon by any client-side code that is part of the application.
    this.allow({
      insert(userId, _doc) {
        return isAdmin(MeteorUsers.findOne(userId));
      },
      update(userId, _doc, _fieldNames, _modifier) {
        return isAdmin(MeteorUsers.findOne(userId));
      },
      remove(userId, _doc) {
        return isAdmin(MeteorUsers.findOne(userId));
      },
    });
  }

  // @ts-expect-error TS is correct that Partial<T> is not equivalent to
  //   OptionalId<T>, but that's because OptionalId<T> isn't exactly correct.
  //   Our SimpleSchemas will fill in some of the missing fields using
  //   autoValues, but it's not possible to have a collection type that
  //   distinguishes between fields that are present/required on read vs. on
  //   write. The resulting declaration is looser than it should be, but it only
  //   pushes validation from type checking to runtime (as SimpleSchema will
  //   verify that required fields are actually present).
  insert<U>(
    doc: ValidateShape<U, Partial<T>>,
    callback?: (err?: Error, id?: string) => void,
  ): string {
    return super.insert(<any>doc, callback);
  }

  // @ts-expect-error See above
  insertAsync<U>(
    doc: ValidateShape<U, Partial<T>>
  ): Promise<string> {
    return super.insertAsync(<any>doc);
  }

  // All models have a destroy method which marks them as soft-deleted,
  // and allows specifying a callback to aid in performing any cascading
  // required.  At the time of writing, we do not actually do any cascading.
  destroy(selector: FindSelector<T>, callback?: (error: Error | null, updated: number) => void) {
    this.update(
      this[formatQuery](selector),
      // There are some weird interactions here betwen T being a generic type
      // and Partial<T> where Typescript isn't actually able to satisfy that
      // this value satisfies Mongo.Modifier<T>, so we need an explicit cast.
      <Mongo.Modifier<T>>{ $set: { deleted: true } },
      { multi: true },
      callback
    );
  }

  destroyAsync(selector: FindSelector<T>): Promise<number> {
    return this.updateAsync(
      this[formatQuery](selector),
      <Mongo.Modifier<T>>{ $set: { deleted: true } },
      { multi: true }
    );
  }

  undestroy(selector: FindSelector<T>, callback?: (error: Error | null, updated: number) => void) {
    this.update(
      this[formatQuery](selector),
      <Mongo.Modifier<T>>{ $set: { deleted: false } },
      { multi: true },
      callback
    );
  }

  undestroyAsync(selector: FindSelector<T>): Promise<number> {
    return this.updateAsync(
      this[formatQuery](selector),
      <Mongo.Modifier<T>>{ $set: { deleted: false } },
      { multi: true }
    );
  }

  [formatQuery](selector: FindSelector<T>): Mongo.Selector<T> {
    if (typeof selector === 'string') {
      return <Mongo.Selector<T>>{ _id: selector };
    } else if (selector instanceof Mongo.ObjectID) {
      return <Mongo.Selector<T>>{ _id: selector };
    } else {
      return selector;
    }
  }

  [formatOptions]<Opts extends FindOneOptions>(opts: Opts): Opts {
    if (opts.fields) {
      return {
        ...opts,
        fields: {
          ...opts.fields,
          deleted: 1,
        },
      };
    }

    return opts;
  }

  find<Selector extends FindSelector<T>>(selector?: Selector, options: FindOptions = {}) {
    return super.find(
      { ...this[formatQuery](selector ?? {}), deleted: false as any },
      this[formatOptions](options)
    ) as Mongo.Cursor<SelectorToResultType<T, Selector>>;
  }

  findOne<Selector extends FindSelector<T>>(selector?: Selector, options: FindOneOptions = {}) {
    return super.findOne(
      { ...this[formatQuery](selector ?? {}), deleted: false as any },
      this[formatOptions](options)
    ) as SelectorToResultType<T, Selector> | undefined;
  }

  findOneAsync<Selector extends FindSelector<T>>(
    selector?: Selector,
    options: FindOneOptions = {},
  ) {
    return super.findOneAsync(
      { ...this[formatQuery](selector ?? {}), deleted: false as any },
      this[formatOptions](options)
    ) as Promise<SelectorToResultType<T, Selector> | undefined>;
  }

  findDeleted<Selector extends FindSelector<T>>(selector?: Selector, options: FindOptions = {}) {
    return super.find(
      { ...this[formatQuery](selector ?? {}), deleted: true as any },
      this[formatOptions](options)
    ) as Mongo.Cursor<SelectorToResultType<T, Selector>>;
  }

  findOneDeleted<Selector extends FindSelector<T>>(
    selector?: Selector,
    options: FindOneOptions = {},
  ) {
    return super.findOne(
      { ...this[formatQuery](selector ?? {}), deleted: true as any },
      this[formatOptions](options)
    ) as SelectorToResultType<T, Selector> | undefined;
  }

  findOneDeletedAsync<Selector extends FindSelector<T>>(
    selector?: Selector,
    options: FindOneOptions = {},
  ) {
    return Promise.resolve(this.findOneDeleted(selector, options));
  }

  findAllowingDeleted<Selector extends FindSelector<T>>(
    selector?: Selector,
    options: FindOptions = {}
  ) {
    return super.find(selector, options) as Mongo.Cursor<SelectorToResultType<T, Selector>>;
  }

  findOneAllowingDeleted<Selector extends FindSelector<T>>(
    selector?: Selector,
    options: FindOneOptions = {},
  ) {
    return super.findOne(selector, options) as SelectorToResultType<T, Selector> | undefined;
  }

  findOneAllowingDeletedAsync<Selector extends FindSelector<T>>(
    selector?: Selector,
    options: FindOneOptions = {},
  ) {
    return Promise.resolve(this.findOneAllowingDeleted(selector, options)) as
      Promise<SelectorToResultType<T, Selector> | undefined>;
  }
}

export default Base;
