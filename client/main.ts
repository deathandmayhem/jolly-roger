// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts';

// explicitly import all the stuff from client/
import '../imports/client/main';
import '../imports/client/close';

declare global {
  interface Window {
    loadFacades: () => void;
  }
}

window.loadFacades = async () => {
  const [models, schemas] = await Promise.all([
    import('../imports/lib/models/facade'),
    import('../imports/lib/schemas/facade'),
  ]);
  Object.defineProperty(window, 'Models', { value: models.default });
  Object.defineProperty(window, 'Schemas', { value: schemas.default });
};
