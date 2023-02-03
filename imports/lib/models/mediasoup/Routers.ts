import Router from '../../schemas/mediasoup/Router';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const Routers = new SoftDeletedModel('jr_mediasoup_routers', Router);
export type RouterType = ModelType<typeof Routers>;

export default Routers;
