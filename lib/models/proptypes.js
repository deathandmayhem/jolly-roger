import React from 'react';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const mapKeyToReactPropTypes = function (schema, key) {
  // Attempts to map the field into a React type, a process which may involve looking at other keys
  // in the schema.
  const field = schema[key];
  const type = field.type;
  let reactType;

  // Add more types as needed.
  if (type === String) {
    reactType = React.PropTypes.string;
  } else if (type === Boolean) {
    reactType = React.PropTypes.bool;
  } else if (type === Date) {
    reactType = React.PropTypes.object;
  } else if (type === Array) {
    // eslint-disable-next-line prefer-template
    const innerType = mapKeyToReactPropTypes(schema, key + '.$');
    reactType = React.PropTypes.arrayOf(innerType);
  } else if (type === Object) {
    // TODO: be more specific about the shape of the object
    // We should be able to learn some things about the shape of this field if there are
    // schema rules named field.*, and then we should use React.PropTypes.shape instead.
    // If field.blackbox is true, though, this is meant to be an opaque object.
    reactType = React.PropTypes.object;
  }

  if (reactType === undefined) {
    // eslint-disable-next-line no-console
    console.error('unsupported type in schema:', type, type.name);
    return undefined;
  }

  if (!field.optional) {
    reactType = reactType.isRequired;
  }

  return reactType;
};

// Converts a SimpleSchema into a React.PropTypes-compatible structure by reaching into
// SimpleSchema's internals, to allow specifying props that match the DB shape exactly.
// Yay, pseudo-typechecking.
// Note that this shape is neither complete nor as expressive as the schema.
// This just makes it handier to use with React.
SimpleSchema.prototype.asReactPropTypes = function asReactPropTypes() {
  const pt = {};
  for (let i = 0; i < this._schemaKeys.length; i++) {
    const key = this._schemaKeys[i];

    // Skip inner references to array or object members - these will be processed when looking at
    // their object parents or containing array.
    if (key.indexOf('.') !== -1) {
      continue; // eslint-disable-line no-continue
    }

    const reactType = mapKeyToReactPropTypes(this._schema, key);
    pt[key] = reactType;
  }

  return pt;
};
