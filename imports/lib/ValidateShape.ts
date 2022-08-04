type ValidateShape<T, Shape> =
  Shape & { [K in keyof T]: K extends keyof Shape ? T[K] : never };

export default ValidateShape;
