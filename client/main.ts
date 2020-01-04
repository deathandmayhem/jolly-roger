import '../imports/client/stylesheets/bootstrap.less';

// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts';

// add the proptypes helpers to all SimpleSchemas
import '../imports/lib/models/proptypes';

// attach the users schema to Meteor.users
import '../imports/lib/models/users';

// register actions and roles
import '../imports/lib/roles';

// Configure marked and moment
import '../imports/client/marked';
import '../imports/client/moment';

// explicitly import all the stuff from client/
import '../imports/client/main';
import '../imports/client/close';

// Export the schemas and models facades for interaction from the console
import SchemasFacade from '../imports/lib/schemas/facade';
import ModelsFacade from '../imports/lib/models/facade';

declare global {
  interface Window {
    Schemas: typeof SchemasFacade;
    Models: typeof ModelsFacade;
  }
}

window.Schemas = SchemasFacade;
window.Models = ModelsFacade;
