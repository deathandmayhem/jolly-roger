import RouterSchema, { RouterType } from '../../schemas/mediasoup/Router';
import Base from '../Base';

const Routers = new Base<RouterType>('mediasoup_routers');
Routers.attachSchema(RouterSchema);

export default Routers;
