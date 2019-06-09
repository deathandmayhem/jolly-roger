import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';
import { BaseType } from '../schemas/base';

const formatQuery = Symbol('formatQuery');
const formatOptions = Symbol('formatOptions');

export type FindSelector<T> = string | Mongo.ObjectID | Mongo.Selector<T>
export type FindOneOptions = {
  sort?: Mongo.SortSpecifier;
  skip?: number;
  fields?: Mongo.FieldSpecifier;
  reactive?: boolean;
  transform?: Function | null;
}
export type FindOptions = FindOneOptions & {
  limit?: number;
}

class Base<T extends BaseType> extends Mongo.Collection<T> {
  public name: string;

  constructor(name: string, options = {}) {
    // Namespace table name in mongo
    super(`jr_${name}`, options);
    this.name = name;

    // All models have standard roles
    this.attachRoles(`mongo.${name}`);
  }

  // Because the Mongo.Collection doesn't know about SimpleSchema autovalues, it
  // doesn't know which fields are actually required. This is a coarse
  // workaround, but it's hard to pick the autoValue out from just the types.
  insert(doc: Partial<T>, callback?: Function): string {
    return super.insert(<any>doc, callback);
  }

  // All models have a destroy method which performs any cascading
  // required (though since all models also have a "deleted" property
  // that hides all children, the default implementation usually
  // works)
  destroy(id: string, callback?: (error: Error, updated: number) => void) {
    this.update(
      id,
      // There are some weird interactions here betwen T being a generic type
      // and Partial<T> where Typescript isn't actually able to satisfy that
      // this value satisfies Mongo.Modifier<T>, so we need an explicit cast.
      <Mongo.Modifier<T>>{ $set: { deleted: true } },
      {},
      callback
    );
  }

  undestroy(id: string, callback?: (error: Error, updated: number) => void) {
    this.update(id, <Mongo.Modifier<T>>{ $set: { deleted: false } }, {}, callback);
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
      return _.extend(
        {},
        opts,
        {
          fields: _.extend(
            {},
            opts.fields,
            { deleted: 1 },
          ),
        },
      );
    }

    return opts;
  }

  find(selector: FindSelector<T> = {}, options: FindOptions = {}) {
    return super.find(
      _.extend({ deleted: false }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
  }

  findOne(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOne(
      _.extend({ deleted: false }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
  }

  findDeleted(selector: FindSelector<T> = {}, options: FindOptions = {}) {
    return super.find(
      _.extend({ deleted: true }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
  }

  findOneDeleted(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOne(
      _.extend({ deleted: true }, this[formatQuery](selector)),
      this[formatOptions](options)
    );
  }

  findAllowingDeleted(selector: FindSelector<T> = {}, options: FindOptions = {}) {
    return super.find(selector, options);
  }

  findOneAllowingDeleted(selector: FindSelector<T> = {}, options: FindOneOptions = {}) {
    return super.findOne(selector, options);
  }

  publish(modifier?: (this: Subscription, q: Mongo.Selector<T>) => Mongo.Selector<T>) {
    if (!Meteor.isServer) {
      return;
    }

    const publishFunc = function publishFunc(
      findFunc: (query: Mongo.Selector<T>, opts: FindOptions) => void
    ) {
      return function (this: Subscription, q: Mongo.Selector<T> = {}, opts: FindOptions = {}) {
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

        let query = q;
        if (modifier) {
          query = modifier.apply(this, [q]);
        }

        return findFunc(query, opts);
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
