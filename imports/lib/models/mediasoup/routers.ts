import RouterSchema, { RouterType } from '../../schemas/mediasoup/router';
import Base from '../base';

const Routers = new Base<RouterType>('mediasoup_routers');
Routers.attachSchema(RouterSchema);

export default Routers;
