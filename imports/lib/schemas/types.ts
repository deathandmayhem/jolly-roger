/* eslint-disable import/prefer-default-export */
import * as t from 'io-ts';

export const uint8Array = new t.Type<Uint8Array>(
  'Uint8Array',
  (input: unknown): input is Uint8Array => input instanceof Uint8Array,
  (input, context) => (input instanceof Uint8Array ? t.success(input) : t.failure(input, context)),
  t.identity
);
