import { check, Match } from 'meteor/check';
import { Meteor, Subscription } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { userIdIsAdmin } from '../is-admin';
import { BaseType } from '../schemas/base';

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

type ValidateShape<T, Shape> =
    T extends Partial<Shape> ?
    Exclude<keyof T, keyof Shape> extends never ?
    T : never : never;

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

  // @ts-ignore Because the Mongo.Collection doesn't know about SimpleSchema
  //   autovalues, it doesn't know which fields are actually required. This is a
  //   coarse workaround, but it's hard to pick the autoValue out from just the
  //   types.
  insert<U>(doc: ValidateShape<U, Partial<T>>, callback?: Function): string {
    return super.insert(<any>doc, callback);
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

  undestroy(selector: FindSelector<T>, callback?: (error: Error | null, updated: number) => void) {
    this.update(
      this[formatQuery](selector),
      <Mongo.Modifier<T>>{ $set: { deleted: false } },
      { multi: true },
      callback
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

  findAllowingDeleted(selector: FindSelector<T> = {}, options: FindOptions = {}) {
    return super.find(selector, options);
  }

  findOneAllowingDeleted(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOne(selector, options);
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
