import { check } from 'meteor/check';
import { EJSONable, EJSONableProperty } from 'meteor/ejson';
import { Meteor } from 'meteor/meteor';

type TypedMethodParam = EJSONable | EJSONableProperty
type TypedMethodArgs = Record<string, TypedMethodParam>;
type TypedMethodValidator<Arg extends TypedMethodArgs> =
  (this: Meteor.MethodThisType, arg0: unknown) =>
    Arg;
type TypedMethodRun<Arg extends TypedMethodArgs, Return extends TypedMethodParam | void> =
  (this: Meteor.MethodThisType, arg0: Arg) => Return;

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

  define({ validate, run }: {
    validate: TypedMethodValidator<Args>,
    run: TypedMethodRun<Args, Return>,
  }) {
    if (this.definition) {
      throw new Error(`TypedMethod ${this.name} has already been defined`);
    }

    this.definition = { validate, run };

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
        self.execute(this, arg0);
      },
    });
  }

  execute(context: Meteor.MethodThisType, arg0: Args): Return {
    if (!this.definition) {
      throw new Error(`TypedMethod ${this.name} has not been defined`);
    }

    const validatedArgs = this.definition.validate.bind(context)(arg0);
    const result = this.definition.run.bind(context)(validatedArgs);
    return result;
  }

  call(
    arg0: Args,
    callback?: (error: Meteor.Error, result: Return) => void,
  ): void {
    return Meteor.call(this.name, arg0, callback);
  }

  callPromise(arg0: Args): Promise<Return> {
    return Meteor.callPromise(this.name, arg0);
  }
}
