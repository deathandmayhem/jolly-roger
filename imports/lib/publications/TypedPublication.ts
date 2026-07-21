import z from "zod";
import type { ValidateEJSONableArgs } from "../ValidateEJSONable";

export class BaseTypedPublication<
  Args extends z.AnyZodTuple,
  Name extends string | (z.infer<Args> extends [] ? null : never),
> {
  name: Name;
  args: Args;

  constructor(name: Name, args: ValidateEJSONableArgs<Args>) {
    this.name = name;
    this.args = args;
  }
}

export class DefaultTypedPublication extends BaseTypedPublication<
  z.ZodTuple<[]>,
  null
> {
  constructor() {
    super(null, z.tuple([]));
  }
}

export default class TypedPublication<
  Args extends z.AnyZodTuple,
> extends BaseTypedPublication<Args, string> {}
