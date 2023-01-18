import type express from 'express';

export default (fn: (...args: Parameters<express.Handler>) => Promise<void>): express.Handler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
