import { check } from 'meteor/check';
import { EJSON, EJSONable, EJSONableProperty } from 'meteor/ejson';
import { Meteor } from 'meteor/meteor';
import Bugsnag from '@bugsnag/js';
import ValidateShape from '../lib/ValidateShape';

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
type TypedMethodCallArgs<T, Arg extends TypedMethodArgs, Return extends TypedMethodParam | void> =
  Arg extends void ?
    ([TypedMethodCallback<Return>] | []) :
    ([ValidateShape<T, Arg>, TypedMethodCallback<Return>] | [Arg]);
type TypedMethodCallPromiseArgs<T, Arg extends TypedMethodArgs> =
  Arg extends void ?
    [] :
    [ValidateShape<T, Arg>];

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
      validate: (validate ?? voidValidator) as TypedMethodValidator<Args>,
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

  async execute(context: Meteor.MethodThisType, arg0: Args): Promise<Return> {
    if (!this.definition) {
      throw new Error(`TypedMethod ${this.name} has not been defined`);
    }

    let result;
    try {
      // In the case of no arguments, the type system will track the return
      // value from `validate` as `void`, but because it's a function that
      // doesn't return anything, it will in practice be `undefined`.
      const validatedArgs = this.definition.validate.bind(context)(arg0);
      result = await this.definition.run.bind(context)(validatedArgs as any);
    } catch (error) {
      if (error instanceof Error && Bugsnag.isStarted()) {
        // Attempt to classify severity based on the following rules:
        // - If the error has a `sanitizedError` property, look at that instead of the error itself
        // - If the error is a Meteor.Error and error.error is a number between 400 and 499, it's
        //   info severity
        // - Otherwise, it's error severity
        const sanitizedError = (error as any).sanitizedError ?? error;
        const severity =
          sanitizedError instanceof Meteor.Error &&
            sanitizedError.error >= 400 &&
            sanitizedError.error < 500 ?
            'info' :
            'error';

        Bugsnag.notify(error, (event) => {
          // eslint-disable-next-line no-param-reassign
          event.context = this.name;
          // eslint-disable-next-line no-param-reassign
          event.severity = severity;
          event.addMetadata('method', {
            arguments: EJSON.stringify(arg0 ?? {}),
          });
        });
      }
      throw error;
    }

    return result;
  }

  call<T>(...args: TypedMethodCallArgs<T, Args, Return>): void {
    // If we invoke a function on the client, the arguments get encoded to EJSON
    // before being sent over DDP. This has the effect (among other things) of
    // stripping out any key-value pairs where the value is undefined. This
    // doesn't happen on the server, which can cause bad interactions with
    // Match.Optional, which permits keys to be absent but does _not_ permit the
    // value to be undefined
    //
    // Round-tripping through EJSON on the server ensures that we get the same
    // behavior
    const cleaned = args.map((a) => {
      return Meteor.isServer &&
        typeof a === 'object' ? EJSON.parse(EJSON.stringify(a)) :
        a;
    });
    return Meteor.call(this.name, ...cleaned);
  }

  callPromise<T>(...args: TypedMethodCallPromiseArgs<T, Args>): Promise<Return> {
    const cleaned = args.map((a) => {
      return Meteor.isServer &&
        typeof a === 'object' ? EJSON.parse(EJSON.stringify(a)) :
        a;
    });
    return Meteor.callAsync(this.name, ...cleaned);
  }
}
