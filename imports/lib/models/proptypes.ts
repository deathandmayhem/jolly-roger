import * as PropTypes from 'prop-types';
import SimpleSchema from 'simpl-schema';

declare module 'simpl-schema' {
  // eslint-disable-next-line import/prefer-default-export
  export interface SimpleSchema {
    // asReactPropTypes returns something that can be passed to PropTypes.shape,
    // but we don't have enough type information to figure out what that is, so
    // for Typescript code we require people to pass in the type that we're
    // converting, and we attempt to represent that to the type system.
    asReactPropTypes<T = never>(): {
      [K in keyof T]: React.Validator<T[K]>
    };
    mergedSchema(): Record<string, any>;
    getQuickTypeForKey(key: string): string;
  }
}

const mapKeyToReactPropTypes = function (
  schema: SimpleSchema,
  key: string,
  type: {optional?: boolean}
) {
  // Attempts to map the field into a React type
  //
  // In theory we should be able to get more sophisticated shape types for
  // object and object arrays, but in practice it hasn't seemed to be an issue.
  const quickType = schema.getQuickTypeForKey(key);
  let reactType;
  switch (quickType) {
    case 'string':
      reactType = PropTypes.string;
      break;
    case 'number':
      reactType = PropTypes.number;
      break;
    case 'boolean':
      reactType = PropTypes.bool;
      break;
    case 'date':
      reactType = PropTypes.object;
      break;
    case 'object':
      reactType = PropTypes.object;
      break;
    case 'stringArray':
      reactType = PropTypes.arrayOf(PropTypes.string);
      break;
    case 'numberArray':
      reactType = PropTypes.arrayOf(PropTypes.number);
      break;
    case 'booleanArray':
      reactType = PropTypes.arrayOf(PropTypes.bool);
      break;
    case 'dateArray':
      reactType = PropTypes.arrayOf(PropTypes.object);
      break;
    case 'objectArray':
      reactType = PropTypes.arrayOf(PropTypes.object);
      break;
    default:
      // eslint-disable-next-line no-console
      console.error('unsupported type in schema:', quickType);
      return undefined;
  }

  if (!type.optional) {
    reactType = reactType.isRequired;
  }

  return reactType;
};

// Converts a SimpleSchema into a PropTypes-compatible structure by reaching into
// SimpleSchema's internals, to allow specifying props that match the DB shape exactly.
// Yay, pseudo-typechecking.
// Note that this shape is neither complete nor as expressive as the schema.
// This just makes it handier to use with React.
SimpleSchema.prototype.asReactPropTypes = function asReactPropTypes(
  this: SimpleSchema
): Record<string, React.Validator<any>> {
  const pt: Record<string, React.Validator<any>> = {};
  const schema = this.mergedSchema();
  Object.keys(schema).forEach((key) => {
    // Skip inner references to array or object members - these will be processed when looking at
    // their object parents or containing array.
    if (key.indexOf('.') !== -1) {
      return;
    }

    const reactType = mapKeyToReactPropTypes(this, key, schema[key]);
    if (reactType) {
      pt[key] = reactType;
    }
  });

  return pt;
};
