import type { EJSONable, EJSONableProperty } from "meteor/ejson";

type TypedPublicationParam = EJSONable | EJSONableProperty;
export type TypedPublicationArgs = Record<string, TypedPublicationParam> | void;

export class BaseTypedPublication<
  Args extends TypedPublicationArgs,
  Name extends string | (Args extends void ? null : never),
> {
  name: Name;

  constructor(name: Name) {
    this.name = name;
  }
}

export class DefaultTypedPublication extends BaseTypedPublication<void, null> {
  constructor() {
    super(null);
  }
}

export default class TypedPublication<
  Args extends TypedPublicationArgs,
> extends BaseTypedPublication<Args, string> {}
