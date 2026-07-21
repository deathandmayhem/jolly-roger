import type z from "zod";

// Our own description of what EJSON can serialize. Meteor's EJSONable types
// (from meteor/ejson) include `Object`, which TypeScript treats as "anything
// that isn't null or undefined" (functions, Maps, and class instances all
// qualify), so a constraint built on them accepts every schema and catches
// nothing.
export type EJSONValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Uint8Array
  | EJSONValue[]
  | { [key: string]: EJSONValue };

// Constrain a zod schema to one that describes EJSON-serializable values.
// (Intersecting with `unknown` is a no-op, making the validator an identity
// function; a string will have no overlap with a zod schema, resulting in a
// type error.)
export type ValidateEJSONableArgs<Schema extends z.ZodTypeAny> = Schema &
  (z.input<Schema> extends EJSONValue
    ? unknown
    : "Schema input must be EJSON-serializable");

export type ValidateEJSONableReturn<Schema extends z.ZodTypeAny> = Schema &
  (z.output<Schema> extends void | EJSONValue
    ? unknown
    : "Schema output must be EJSON-serializable");
