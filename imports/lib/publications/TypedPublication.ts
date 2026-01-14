import z from "zod";

export class BaseTypedPublication<
  Args extends z.ZodTuple | z.ZodTuple<[], null>,
  Name extends string | (z.infer<Args> extends [] ? null : never),
> {
  name: Name;
  args: Args;

  constructor(name: Name, args: Args) {
    this.name = name;
    this.args = args;
  }
}

export class DefaultTypedPublication extends BaseTypedPublication<
  z.ZodTuple<[], null>,
  null
> {
  constructor() {
    super(null, z.tuple([]));
  }
}

export default class TypedPublication<
  Args extends z.ZodTuple,
> extends BaseTypedPublication<Args, string> {}
