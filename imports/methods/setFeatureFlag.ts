import TypedMethod from './TypedMethod';

type SetFeatureFlagArgs = {
  name: string,
  type: 'on' | 'off',
};

export default new TypedMethod<SetFeatureFlagArgs, void>(
  'FeatureFlags.methods.set'
);
