import type z from "zod";
import type { ValidateEJSONableArgs } from "../ValidateEJSONable";

export type PublicationName<Args extends z.ZodTuple> =
  | string
  | (z.output<Args> extends [] ? null : never);

export default class TypedPublication<
  Args extends z.ZodTuple,
  Name extends PublicationName<Args> = string,
> {
  name: Name;
  args: Args;

  constructor(name: Name, args: ValidateEJSONableArgs<Args>) {
    this.name = name;
    this.args = args;
  }
}
