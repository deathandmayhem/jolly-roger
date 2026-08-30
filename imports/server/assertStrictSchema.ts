import type { $ZodType, $ZodTypes } from "zod/v4/core";

// Zod's default object schema (z.object) silently discards unrecognized keys,
// which would hide client bugs like misspelled argument names. We require all
// objects to have a catchall (probably by using strictObject, but another
// validator would theoretically be fine).
export default function assertStrictSchema(schema: $ZodType, context: string) {
  const visited = new Set<$ZodType>();

  const walk = (raw: $ZodType, path: string) => {
    if (visited.has(raw)) return;
    visited.add(raw);

    // This is the documented way to traverse a schema
    const node = raw as unknown as $ZodTypes;
    const { def } = node._zod;

    switch (def.type) {
      case "object":
        if (def.catchall === undefined) {
          throw new Error(
            `${context}: non-strict object schema at ${path}; use z.strictObject`,
          );
        }
        for (const [key, field] of Object.entries(def.shape)) {
          walk(field, `${path}.${key}`);
        }
        walk(def.catchall, `${path}[catchall]`);
        break;

      case "tuple":
        def.items.forEach((item, index) => walk(item, `${path}[${index}]`));
        if (def.rest) {
          walk(def.rest, `${path}[rest]`);
        }
        break;

      case "array":
        walk(def.element, `${path}[]`);
        break;

      case "union":
        def.options.forEach((option, index) =>
          walk(option, `${path}[option ${index}]`),
        );
        break;

      case "intersection":
        walk(def.left, `${path}[left]`);
        walk(def.right, `${path}[right]`);
        break;

      case "record":
      case "map":
        walk(def.keyType, `${path}[key]`);
        walk(def.valueType, `${path}[value]`);
        break;

      case "set":
        walk(def.valueType, `${path}[value]`);
        break;

      case "optional":
      case "nullable":
      case "default":
      case "prefault":
      case "nonoptional":
      case "readonly":
      case "catch":
      case "success":
      case "promise":
        walk(def.innerType, path);
        break;

      case "lazy":
        walk(def.getter(), path);
        break;

      case "pipe":
        walk(def.in, `${path}[in]`);
        walk(def.out, `${path}[out]`);
        break;

      // Leaf types that can't contain an object schema
      case "string":
      case "number":
      case "bigint":
      case "boolean":
      case "date":
      case "symbol":
      case "null":
      case "undefined":
      case "void":
      case "never":
      case "any":
      case "unknown":
      case "nan":
      case "enum":
      case "literal":
      case "template_literal":
      case "file":
      case "transform":
      case "custom":
        break;

      default:
        // Fail loud rather than silently skipping a schema type (a future
        // wrapper could hide a strip-mode object from this audit).
        throw new Error(
          `${context}: unrecognized schema type ${def.type} at ${path}`,
        );
    }
  };

  walk(schema, "args");
}
