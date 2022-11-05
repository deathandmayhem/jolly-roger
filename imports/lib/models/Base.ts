import { check, Match } from 'meteor/check';
import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import ValidateShape from '../ValidateShape';
import { userIdIsAdmin } from '../is-admin';
import { BaseType } from '../schemas/Base';

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
        return userIdIsAdmin(userId);
      },
      update(userId, _doc, _fieldNames, _modifier) {
        return userIdIsAdmin(userId);
      },
      remove(userId, _doc) {
        return userIdIsAdmin(userId);
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

  find(selector: FindSelector<T> = {}, options: FindOptions = {}) {
    return super.find(
      { ...this[formatQuery](selector), deleted: false as any },
      this[formatOptions](options)
    );
  }

  findOne(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOne(
      { ...this[formatQuery](selector), deleted: false as any },
      this[formatOptions](options)
    );
  }

  findOneAsync(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOneAsync(
      { ...this[formatQuery](selector), deleted: false as any },
      this[formatOptions](options)
    );
  }

  findDeleted(selector: FindSelector<T> = {}, options: FindOptions = {}) {
    return super.find(
      { ...this[formatQuery](selector), deleted: true as any },
      this[formatOptions](options)
    );
  }

  findOneDeleted(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOne(
      { ...this[formatQuery](selector), deleted: true as any },
      this[formatOptions](options)
    );
  }

  findOneDeletedAsync(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOneAsync(
      { ...this[formatQuery](selector), deleted: true as any },
      this[formatOptions](options)
    );
  }

  findAllowingDeleted(selector: FindSelector<T> = {}, options: FindOptions = {}) {
    return super.find(selector, options);
  }

  findOneAllowingDeleted(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOne(selector, options);
  }

  findOneAllowingDeletedAsync(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOneAsync(selector, options);
  }

  publish(makeConstraint?: (userId: string) => Mongo.Query<T> | undefined) {
    if (!Meteor.isServer) {
      return;
    }

    const publishFunc = function publishFunc(
      findFunc: (query: Mongo.Query<T>, opts: FindOptions) => Mongo.Cursor<T>
    ) {
      return function (this: Subscription, q: unknown = {}, opts: unknown = {}) {
        check(q, Object);
        check(opts, {
          fields: Match.Maybe(Object),
          sort: Match.Maybe(Object),
          skip: Match.Maybe(Number),
          limit: Match.Maybe(Number),
        });

        if (!this.userId) {
          return [];
        }

        let query: Mongo.Query<T> | undefined = q;
        const constraint = makeConstraint?.(this.userId);
        if (constraint) {
          // Typescript seems unable to tell that "$and" can not be a key in T,
          // so it tries to interpret it as a field expression, rather than an
          // $and literal. I couldn't figure out how to avoid needing a cast
          // here
          query = { $and: [query, constraint] } as Mongo.Query<T>;
        }

        return findFunc(query, opts as FindOptions);
      };
    };
    Meteor.publish(`mongo.${this.name}`, publishFunc(this.find.bind(this)));
    Meteor.publish(`mongo.${this.name}.deleted`, publishFunc(this.findDeleted.bind(this)));
    Meteor.publish(
      `mongo.${this.name}.allowingDeleted`,
      publishFunc(this.findAllowingDeleted.bind(this))
    );
  }
}

export default Base;
