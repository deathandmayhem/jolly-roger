import { Mongo } from 'meteor/mongo';
import { DependencyList } from 'react';

declare module 'meteor/react-meteor-data' {
  function useSubscribe(name?: string, ...args: any[]): () => boolean;

  function useFind<T = any>(
    factory: () => (Mongo.Cursor<T> | undefined | null),
    deps?: DependencyList,
  ): T[];
}
