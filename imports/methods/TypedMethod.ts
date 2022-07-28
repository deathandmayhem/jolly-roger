import { check } from 'meteor/check';
import { EJSONable, EJSONableProperty } from 'meteor/ejson';
import { Meteor } from 'meteor/meteor';

type TypedMethodParam = EJSONable | EJSONableProperty;
type TypedMethodArgs = Record<string, TypedMethodParam> | void;
type TypedMethodValidator<Arg extends TypedMethodArgs> =
  (this: Meteor.MethodThisType, arg0: unknown) =>
    Arg;
type TypedMethodRun<Arg extends TypedMethodArgs, Return extends TypedMethodParam | void> =
  Arg extends void ?
  (this: Meteor.MethodThisType) => Return | Promise<Return> :
  (this: Meteor.MethodThisType, arg0: Arg) => Return | Promise<Return>;
type TypedMethodCallback<Return extends TypedMethodParam | void> =
  Return extends void ?
    (error?: Meteor.Error) => void :
    <Error extends true | false>(
      error: Error extends true ? Meteor.Error : undefined,
      result: Error extends false ? Return : undefined,
    ) => void;
type TypedMethodCallArgs<Arg extends TypedMethodArgs, Return extends TypedMethodParam | void> =
  Arg extends void ?
    ([TypedMethodCallback<Return>] | []) :
    ([Arg, TypedMethodCallback<Return>] | [Arg]);
type TypedMethodCallPromiseArgs<Arg extends TypedMethodArgs> =
  Arg extends void ?
    [] :
    [Arg];

const voidValidator = () => { /* noop */ };

export default class TypedMethod<
  Args extends TypedMethodArgs,
  Return extends TypedMethodParam | void,
> {
  name: string;

  definition?: {
    validate: TypedMethodValidator<Args>,
    run: TypedMethodRun<Args, Return>,
  };

  constructor(name: string) {
    check(name, String);

    this.name = name;
  }

  // Supporting methods with no (void) arguments is a bit messy, but comes up
  // often enough that it's worth doing properly. With no arguments, the type
  // system doesn't accept a validator. However, there's no way to access type
  // information at runtime, so when no validator is provided, we substitute
  // `voidValidator` at runtime (which explicitly discards any arguments,
  // ensuring that they aren't passed through to the `run` implementation).
  //
  // Ideally we'd declare the `validate` method in a way that it is absent for
  // void and present for non-void and subsequently check for the
  // presence/absence to hint to the type system whether or not we were dealing
  // with a void method, but I wasn't able to get the type system to make
  // inference in that direction (that the absence of a validate method implied
  // void arguments), which just made everything more awkward.
  define({ validate, run }: {
    run: TypedMethodRun<Args, Return>,
  } & (
    Args extends void ? { validate?: undefined } : { validate: TypedMethodValidator<Args> }
  )) {
    if (this.definition) {
      throw new Error(`TypedMethod ${this.name} has already been defined`);
    }

    this.definition = {
      validate: (validate || voidValidator) as TypedMethodValidator<Args>,
      run,
    };

    /* eslint-disable-next-line @typescript-eslint/no-this-alias -- we need to
       capture both the TypedMethod object (so we can find the implementation)
       and the method invocation context (for things like userId) */
    const self = this;
    Meteor.methods({
      /* eslint-disable-next-line meteor/audit-argument-checks -- because we're
        wrapping the method call, the eslint check can't tell what's going on,
        but the actual Meteor audit-argument-checks package will still fire if
        we don't use check methods. */
      [this.name](arg0: Args) {
        return self.execute(this, arg0);
      },
    });
  }

  execute(context: Meteor.MethodThisType, arg0: Args): Return | Promise<Return> {
    if (!this.definition) {
      throw new Error(`TypedMethod ${this.name} has not been defined`);
    }

    // In the case of no arguments, the type system will track the return value
    // from `validate` as `void`, but because it's a function that doesn't
    // return anything, it will in practice be `undefined`.
    const validatedArgs = this.definition.validate.bind(context)(arg0);
    const result = this.definition.run.bind(context)(validatedArgs as any);
    return result;
  }

  call(...args: TypedMethodCallArgs<Args, Return>): void {
    return Meteor.call(this.name, ...args);
  }

  callPromise(...args: TypedMethodCallPromiseArgs<Args>): Promise<Return> {
    return Meteor.callPromise(this.name, ...args);
  }
}
