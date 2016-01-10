Jolly Roger
===========

![Jolly Roger](public/images/hero.png)

The next generation Virtual HQ for Death and Mayhem, written in
Meteor. It uses [react-router][react-router] for navigation and
[Collection2][collection2] for schema support.

Getting Started
---------------

Jolly Roger uses support in Meteor for [ECMAScript 6][es6] (which is
compiled by [Babel][babeljs] down to ES 5) and [React][React]. You
need at least version 1.2 for this support. Once you've [installed
Meteor][meteor install], you can start the server by just running:

```bash
meteor
```

Right now, there's no onboarding flow for the first user, so you'll
have to manually create a user:

```js
meteor shell
> Accounts.createUser({email: 'broder@mit.edu', password: 'password'})
'WaoEku3wBrWLLc7pK'
```

You'll probably also want to make yourself an admin:

```js
> Roles.addUserToRoles('WaoEku3wBrWLLc7pK', 'admin')
```

Organization
------------

Jolly Roger is primarily structured as a client-side app. The server
primarily performs authentication (and authorization, for writes), but
otherwise largely exposes Meteor's MongoDB interfaces for direct
consumption by the client. The server performs no authorization for
accessing data - any authenticated user can query any app model.

Style
-----

This project uses [Airbnb's JavaScript style
guide][airbnb-javascript]. It's not perfect, but it's one of the more
modern presets, and if nothing else it forces some
consistency. There's an included [JSCS][] config file.

Models
------

All Jolly Roger database models have defined schemas to try and
protect our sanity. Each model should use SimpleSchema's support for
[chaining][simple-schema-chaining] to include the `Schemas.Base`
schema, which adds standardized fields like `createdAt` and
`updatedAt`.

Each model should also have a wrapper class. If no custom
functionality is needed, you can use the default `Transforms.Base`
class, which just adds a new `model` attribute pointing to the
collection the object came from.

The collection objects (under `Models`) should all be instances of
`Models.Base` (or a subclass). The base model automatically wraps
documents in a class (which can be overridden) and sets up a
role-based system for modifications.

However, `Models.Base` instances are not automatically published. You
can call `model.publish()` to do that. You can optionally pass a
function which modifies the query to add additional restrictions,
c.f. `Models.Puzzles` which restricts the `hunt` query term to hunts
that the user is a member of.

Roles
-----

Jolly Roger pulls in [nicolaslopezj's roles package][roles] package
for managing permissions. Roles are automatically added to models to
control modifications. Templates and other code should be written to
take roles into account, but in practice we'll likely use the admin
role for controlling virtually all permissioning.

Google Integration
------------------

Jolly Roger uses Google Spreadsheets for the per-puzzle collaboration
document, and it automatically provisions them when puzzles are
created. (This helps with, e.g., permissions issues with manually
created documents).

In order to access the Google APIs, you first need to create a Google
OAuth client ID. From the [Google Developer Credentials
Console][google-developer-credentials], create a new OAuth Client
ID. If you're developing locally (via localhost), choose "Other";
otherwise, choose "Web application". Once you have the client ID,
store it in the Meteor shell by running:

```js
> ServiceConfiguration.configurations.upsert({service: 'google'}, {
    clientId: 'CLIENT ID',
    secret: 'SECRET',
    loginStyle: 'popup',
  })
```

Once that's done, manually navigate to `/setup`
(e.g. http://localhost:3000/setup). From there, you'll be able to link
an account to the OAuth application, giving Jolly Roger permissions to
create documents on behalf of that account.

(In production, we have a dedicated Google account that owns both the
OAuth application and the Drive credentials)

[airbnb-javascript]: https://github.com/airbnb/javascript
[babeljs]: http://babeljs.io
[collection2]: https://atmospherejs.com/aldeed/collection2
[es6]: https://github.com/lukehoban/es6features
[google-developer-credentials]: https://console.developers.google.com/apis/credentials
[JSCS]: http://jscs.info/
[meteor install]: https://www.meteor.com/install
[React]: https://facebook.github.io/react/
[react-router]: https://github.com/rackt/react-router
[roles]: https://atmospherejs.com/nicolaslopezj/roles
[simple-schema-chaining]: https://github.com/aldeed/meteor-simple-schema#combining-simpleschemas
