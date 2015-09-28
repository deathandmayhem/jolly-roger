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

```
meteor --release PLUGINS-PREVIEW@2
```

This goes for all Meteor commands (e.g. `meteor add`, `meteor mongo`,
`meteor shell`) that you run.

[babeljs]: http://babeljs.io
[es6]: https://github.com/lukehoban/es6features
[iron-router]: https://atmospherejs.com/iron/router
[collection2]: https://atmospherejs.com/aldeed/collection2
