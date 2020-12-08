// Pseudo-collection used to pull down RTC config
import { Mongo } from 'meteor/mongo';

export type RTCConfigType = {
  _id: string;
  username: string;
  credential: string;
  urls: string[];
}

export const RTCConfig = new Mongo.Collection<RTCConfigType>('rtcconfig');
