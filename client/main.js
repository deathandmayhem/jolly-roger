import 'bootstrap/dist/css/bootstrap.min.css';

// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts.js';

// add the proptypes helpers to all SimpleSchemas
import '../imports/lib/models/proptypes.js';

// attach the users schema to Meteor.users
import '../imports/lib/models/users.js';

// register actions and roles
import '../imports/lib/roles.js';

// Configure marked and moment
import '../imports/client/marked.js';
import '../imports/client/moment.js';

// explicitly import all the stuff from client/
import '../imports/client/main.jsx';
import '../imports/client/close.js';

// Export the schemas and models facades for interaction from the console
import SchemasFacade from '../imports/lib/schemas/facade.js';
import ModelsFacade from '../imports/lib/models/facade.js';

/* eslint-disable */
Schemas = SchemasFacade;
Models = ModelsFacade;
/* eslint-enable */
