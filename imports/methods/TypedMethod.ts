import { check } from 'meteor/check';
import type { EJSONable, EJSONableProperty } from 'meteor/ejson';
import { Meteor } from 'meteor/meteor';
import type ValidateShape from '../lib/ValidateShape';

export type TypedMethodParam = EJSONable | EJSONableProperty;
export type TypedMethodArgs = Record<string, TypedMethodParam> | void;
type TypedMethodCallback<Return extends TypedMethodParam | void> =
  Return extends void ?
    (error?: Meteor.Error) => void :
    <Error extends true | false>(
      error: Error extends true ? Meteor.Error : undefined,
      result: Error extends false ? Return : undefined,
    ) => void;
type TypedMethodCallArgs<T, Arg extends TypedMethodArgs, Return extends TypedMethodParam | void> =
  Arg extends void ?
    ([TypedMethodCallback<Return>] | []) :
    ([ValidateShape<T, Arg>, TypedMethodCallback<Return>] | [Arg]);
type TypedMethodCallPromiseArgs<T, Arg extends TypedMethodArgs> =
  Arg extends void ?
    [] :
    [ValidateShape<T, Arg>];

export default class TypedMethod<
  Args extends TypedMethodArgs,
  Return extends TypedMethodParam | void,
> {
  name: string;

  constructor(name: string) {
    check(name, String);

    this.name = name;
  }

  call<T>(...args: TypedMethodCallArgs<T, Args, Return>): void {
    return Meteor.call(this.name, ...args);
  }

  callPromise<T>(...args: TypedMethodCallPromiseArgs<T, Args>): Promise<Return> {
    return Meteor.callAsync(this.name, ...args);
  }
}
