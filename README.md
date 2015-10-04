Jolly Roger
===========

![Jolly Roger](public/images/hero.png)

The next generation Virtual HQ for Death and Mayhem, written in
Meteor. It uses [Iron.Router][iron-router] for navigation and
[Collection2][collection2] for schema support.

Getting Started
---------------

Jolly Roger uses pre-release support in Meteor for [ECMAScript 6][es6]
(which is compiled by [Babel][babeljs] down to ES 5). The current
release of Meteor doesn't support the `ecmascript` package, which
wires up Babel, so you have to explicitly request the pre-release
version:

```bash
meteor --release PLUGINS-PREVIEW@2
```

This goes for all Meteor commands (e.g. `meteor add`, `meteor mongo`,
`meteor shell`) that you run.

Right now, there's no user onboarding flow, so you'll have to manually
create a user:

```js
meteor --release PLUGINS-PREVIEW@2 shell
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
documents in a class (which can be overridden), publishes them to
clients, and sets up a role-based system for modifications.

Roles
-----

Jolly Roger pulls in [nicolaslopezj's roles package][roles] package
for managing permissions. Roles are automatically added to models to
control modifications. Templates and other code should be written to
take roles into account, but in practice we'll likely use the admin
role for controlling virtually all permissioning.

[airbnb-javascript]: https://github.com/airbnb/javascript
[babeljs]: http://babeljs.io
[collection2]: https://atmospherejs.com/aldeed/collection2
[es6]: https://github.com/lukehoban/es6features
[iron-router]: https://atmospherejs.com/iron/router
[JSCS]: http://jscs.info/
[roles]: https://atmospherejs.com/nicolaslopezj/roles
[simple-schema-chaining]: https://github.com/aldeed/meteor-simple-schema#combining-simpleschemas
