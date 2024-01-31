import { HygraphSyncHandler } from '../main/preload';

type ObjectKeys<T> =
  T extends object ? (keyof T)[] :
  T extends number ? [] :
  T extends Array<any> | string ? string[] :
  never;
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    hygraphSyncApi: HygraphSyncHandler;
  }

  interface ObjectConstructor {
    keys<T>(o: T): ObjectKeys<T>,
    entries<T>(o: T): [keyof T, T[keyof T]][]
  }
}


export {};
