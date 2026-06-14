type AssertTypesEqual<T, U> =
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the generic-function comparison is the canonical exact-equality idiom; V must stay generic
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2
    ? true
    : { error: "Types are not equal"; type1: T; type2: U };
export default AssertTypesEqual;
