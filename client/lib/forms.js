// Monkeypatch support for a top-level form error into autoform
//
// autoform doesn't have any notion of errors that aren't associated
// with a field, or really any error that isn't purely associated with
// validation. This means that, e.g., if a write isn't allowed, it has
// no idea what to do.
//
// Ideally, we'd localize this state to the template somehow, but I
// can't figure out how to do that (or at least capture the right
// template), so instead we just use a Session variable.

AutoForm.addHooks(null, {
  onError(_, error) {
    // Assume all other errors are from validation ¯\_(ツ)_/¯
    if (error instanceof Meteor.Error) {
      Session.set('formError', error);
    }
  },
});
UI.registerHelper('formError', () => Session.get('formError'));
Template.autoForm.onCreated(() => Session.set('formError', null));
