import mongoose from 'mongoose';

/**
 * Multi-document transactions only exist on a replica set or a sharded
 * cluster (Atlas is always one). A standalone mongod — the default local
 * install, and the mongo:7 service in CI — rejects them with
 * "Transaction numbers are only allowed on a replica set member or mongos".
 *
 * These helpers keep the session (sessions work everywhere) but only open a
 * transaction when the server can run one, so the same code path works in
 * production, in CI and on a developer's machine. On a standalone server the
 * writes simply run without atomicity, which is the most that server can do.
 */
let supported = null;

export const transactionsSupported = async () => {
  if (supported !== null) return supported;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    supported = Boolean(hello.setName) || hello.msg === 'isdbgrid';
  } catch {
    supported = false;
  }
  return supported;
};

export const startTransaction = async (session) => {
  if (await transactionsSupported()) session.startTransaction();
};

export const commitTransaction = async (session) => {
  if (session?.inTransaction()) await session.commitTransaction();
};

export const abortTransaction = async (session) => {
  if (session?.inTransaction()) await session.abortTransaction();
};

/** Drop-in for `session.withTransaction(fn)`. */
export const withTransaction = async (session, fn) =>
  (await transactionsSupported()) ? session.withTransaction(fn) : fn(session);
