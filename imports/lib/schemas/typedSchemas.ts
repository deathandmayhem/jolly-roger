import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import * as t from 'io-ts';
import { DateType } from 'io-ts-types/lib/Date/date';
import SimpleSchema from 'simpl-schema';

type NumberOverrides<T> = T extends number ? {
  min?: number | (() => number);
  max?: number | (() => number);
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
} : {};

type DateOverrides<T> = T extends Date ? {
  min?: Date | (() => Date);
  max?: number | (() => Date);
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
} : {};

type ArrayOverrides<T> = T extends any[] ? {
  minCount?: number | (() => number);
  maxCount?: number | (() => number);
  array?: FieldOverrides<T[0]>;
} : {};

type StringOverrides<T> = T extends string ? {
  min?: number | (() => number);
  max?: number | (() => number);
  exclusiveMin?: boolean;
  exclusiveMax?: boolean;
  regEx?: RegExp | RegExp[] | (() => RegExp | RegExp[]);
  trim?: boolean,
} : {};

type ObjectOverrides<T> = T extends Record<string, any> ? {
  nested?: {[K in keyof T]?: FieldOverrides<T[K]>};
} : {};

interface FieldInfo {
  isSet: boolean;
  value: any;
  operator?: string;
}

type AutoValueFlatten<T> = T extends any[] ? T[0] : T;
interface AutoValueThis<T> {
  key: string;
  value: T | AutoValueFlatten<T>;
  closestSubschemaFieldName: string | null;
  isSet: boolean;
  unset: () => void;
  operator?: string;
  field: (name: string) => FieldInfo;
  siblingField: (name: string) => FieldInfo;
  parentField: () => FieldInfo;

  // These fields are added by collection2
  isInsert: boolean;
  isUpdate: boolean;
  isUpsert: boolean;
  userId: string;
  isFromTrustedCode: boolean;
  docId?: string;
}

type AutoValueReturn<T> = undefined | T | AutoValueFlatten<T> | (T extends any[] ? never :
                                                             {$setOnInsert: T})

type SharedOverrides<T> = {
  defaultValue?: NonNullable<T>;
  autoValue?: (this: AutoValueThis<T>) => AutoValueReturn<T>;

  // These fields are from collection2
  index?: boolean | 1 | -1;
  unique?: boolean;
  sparse?: boolean;
  denyInsert?: boolean;
  denyUpdate?: boolean;
}

export type FieldOverrides<T> =
  NumberOverrides<T> |
  DateOverrides<T> |
  ArrayOverrides<T> |
  StringOverrides<T> |
  ObjectOverrides<T> |
  SharedOverrides<T>;

type FieldDefinition<T> = FieldOverrides<T> & {
  type: any;
  optional: boolean;
  blackbox?: boolean;
  allowedValues?: T[];
}

export type Overrides<T> = {
  [K in keyof T]?: FieldOverrides<T[K]>;
};

const buildLiteralUnionField = function <T, U> (
  fieldName: string,
  literals: t.Type<T>[],
  overrides: FieldOverrides<U> | undefined,
  optional: boolean,
): [string, FieldDefinition<U>][] {
  const values = literals
    .map((lit) => lit instanceof t.LiteralType && lit.value)
    .filter(Boolean);
  let type: Function;
  switch (typeof values[0]) {
    case 'string':
      type = String;
      break;
    case 'number':
      type = Number;
      break;
    case 'boolean':
      type = Boolean;
      break;
    default:
      // LiteralType is restricted to string | number | boolean
      throw new Error('unreachable');
  }

  return [[fieldName, {
    ...overrides, type, optional, allowedValues: values,
  }]];
};

const buildField = function <T> (
  fieldName: string,
  fieldCodec: t.Type<T>,
  overrides: FieldOverrides<T> | undefined,
  optional: boolean = false,
): [string, FieldDefinition<T>][] {
  // Go through each type that SimpleSchema supports, and see if we have one of
  // those

  if (fieldCodec instanceof t.TaggedUnionType) {
    // Tagged unions don't seem representable in SimpleSchema (it has
    // SimpleSchema.oneOf, but can't seem to use the tag value to figure out
    // which branch to follow, so just trust that we'll validate this at
    // runtime)
    return [[fieldName, {
      ...overrides, type: Object, optional, blackbox: true,
    }]];
  } else if (fieldCodec instanceof t.UnionType &&
    fieldCodec.types &&
    fieldCodec.types instanceof Array) {
    const isOptional = fieldCodec.types.some((subtype) => subtype instanceof t.UndefinedType);
    const nonOptional = fieldCodec.types.filter((subtype) => !(subtype instanceof t.UndefinedType));
    if (nonOptional.length === 1) {
      return buildField(fieldName, nonOptional[0], overrides, optional || isOptional);
    }
    if (!nonOptional.find((subtype) => !(subtype instanceof t.LiteralType))) {
      return buildLiteralUnionField(fieldName, nonOptional, overrides, optional);
    }
    return [[
      fieldName,
      (<any>SimpleSchema).oneOf(nonOptional.map((subType) => {
        const fields = buildField(fieldName, subType, overrides);
        if (fields.length > 1) {
          throw new Error('array types as a member of a union are not allowed');
        }
        return fields[0][1];
      })),
    ]];
  } else if (fieldCodec instanceof t.StringType) {
    return [[fieldName, { ...overrides, type: String, optional }]];
  } else if (
    // I'm pretty sure this instanceof check shouldn't be necessary, since
    // RefinementType extends Type, but the compiler seems unhappy with the
    // comparison otherwise.
    fieldCodec instanceof t.RefinementType &&
    fieldCodec === t.Integer
  ) {
    return [[fieldName, { ...overrides, type: SimpleSchema.Integer, optional }]];
  } else if (fieldCodec instanceof t.NumberType) {
    return [[fieldName, { ...overrides, type: Number, optional }]];
  } else if (fieldCodec instanceof t.BooleanType) {
    return [[fieldName, { ...overrides, type: Boolean, optional }]];
  } else if (fieldCodec instanceof DateType) {
    return [[fieldName, { ...overrides, type: Date, optional }]];
  } else if (fieldCodec instanceof t.ArrayType) {
    const schemaOverrides = _.omit(overrides, 'array');
    const arrayOverrides = overrides && (<ArrayOverrides<any[]>>overrides).array;
    return [
      [fieldName, { ...schemaOverrides, type: Array, optional }],
      ...buildField(`${fieldName}.$`, fieldCodec.type, arrayOverrides),
    ];
  } else if (fieldCodec instanceof t.InterfaceType) {
    const schemaOverrides = _.omit(overrides, 'nested');
    const nestedOverrides = overrides && (<ObjectOverrides<Record<string, any>>>overrides).nested;
    return [[fieldName, {
      ...schemaOverrides,
      // eslint-disable-next-line no-use-before-define
      type: buildSchema(fieldCodec, nestedOverrides || {}),
      optional,
    }]];
  } else if (fieldCodec instanceof t.ObjectType) {
    return [[fieldName, {
      ...overrides,
      type: Object,
      blackbox: true,
      optional,
    }]];
  }

  throw new Meteor.Error(`Unknown type ${fieldCodec.name}`);
};

export const buildSchema = function <
  T extends Record<string, any>,
  P extends Record<keyof T, t.Mixed>
> (
  schemaCodec: t.InterfaceType<P, T>,
  overrides: Overrides<T>
): SimpleSchema {
  const schema: Record<string, FieldDefinition<any>> = {};
  Object.keys(schemaCodec.props).forEach((k) => {
    // Don't include the _id field in the schema, as it makes some operations
    // validate strangely (c.f. aldeed/meteor-collection2#124)
    if (k === '_id') {
      return;
    }
    const fields = buildField(k, schemaCodec.props[k], overrides[k]);
    fields.forEach(([name, definition]) => {
      schema[name] = definition;
    });
  });

  return new SimpleSchema(schema);
};

// We chose here to model schema "inheritance" by just doing a merge of the
// properties. An obvious alternative would be to model inheritance as, well,
// inheritance, using `t.intersection`, which would be fine if we just wanted an
// io-ts codec. However, that wouldn't give us any way to represent the
// overrides. So instead, we do this manual merge operation, which can handle
// both the type itself and the overrides.
export const inheritSchema = function <
  PT extends Record<string, any>,
  PP extends Record<keyof PT, t.Mixed>,
  CT extends Record<string, any>,
  CP extends Record<keyof CT, t.Mixed>
> (
  parentSchemaCodec: t.InterfaceType<PP, PT>,
  childSchemaCodec: t.InterfaceType<CP, CT>,
  parentOverrides: Overrides<PT>,
  childOverrides: Overrides<CT>
): [t.TypeC<PP & CP>, Overrides<PT & CP>] {
  const inheritedCodec = t.type({
    ...parentSchemaCodec.props,
    ...childSchemaCodec.props,
  });
  const inheritedOverrides: Overrides<PT & CP> = {};
  Object.keys(parentOverrides).forEach((k) => {
    (inheritedOverrides as any)[k] = parentOverrides[k];
  });
  Object.keys(childOverrides).forEach((k) => {
    (inheritedOverrides as any)[k] = childOverrides[k];
  });

  return [inheritedCodec, inheritedOverrides];
};
