// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts';

// register actions and roles
import '../imports/lib/roles';

// Configure marked
import '../imports/client/marked';

// explicitly import all the stuff from client/
import '../imports/client/main';
import '../imports/client/close';

// Export the schemas and models facades for interaction from the console
import ModelsFacade from '../imports/lib/models/facade';
import SchemasFacade from '../imports/lib/schemas/facade';

declare global {
  interface Window {
    Schemas: typeof SchemasFacade;
    Models: typeof ModelsFacade;
  }
}

window.Schemas = SchemasFacade;
window.Models = ModelsFacade;
