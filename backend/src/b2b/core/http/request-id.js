// @ts-check
import { randomUUID } from 'node:crypto';

const HEADER = 'x-request-id';
const VALID_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Gives every B2B request an id (reuses a well-formed incoming one) and echoes it back.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {void}
 */
export function requestId(req, res, next) {
  const incoming = req.get(HEADER);
  const id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = id;
  res.set(HEADER, id);
  next();
}
