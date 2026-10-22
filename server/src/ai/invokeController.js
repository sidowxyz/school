import AppError from '../utils/AppError.js';

/**
 * Calls an existing Express controller and returns its JSON payload instead of
 * writing to the wire.
 *
 * Why this exists
 * ---------------
 * The richest aggregations in this codebase (`analyticsController`,
 * `attendanceController`) are written as controllers, not services — they take
 * (req, res, next) and call `res.json(...)`. Three options were considered:
 *
 *   1. Refactor them into services.  Correct long-term, but it edits four files
 *      teammates own, on a shared branch, for a feature that is meant to be
 *      purely additive. Rejected for Phase 1.
 *   2. Re-implement the aggregations inside src/ai/.  Duplicates business logic
 *      and guarantees drift. Rejected outright.
 *   3. Adapt the call.  One well-documented ~40-line shim, zero edits to
 *      existing code, and — critically — the controller's own authorization
 *      logic still runs.
 *
 * Option 3 wins on a point that is easy to miss: `attendanceController` narrows
 * results to a teacher's own classes via `getTeacherAssignments(req)`. Because
 * this adapter passes the *real* req (same `req.user`, same role), that scoping
 * executes exactly as it would for a normal HTTP request. Re-implementing the
 * queries would have silently dropped it and leaked the whole school's data.
 *
 * When these controllers are eventually extracted into services, delete this
 * file and call the services directly — no tool definition needs to change.
 */
export const invokeController = (controllerFn, req, { query = {}, params = {} } = {}) =>
  new Promise((resolve, reject) => {
    // Shallow-clone so a tool's query params can't mutate the live request.
    const scopedReq = Object.create(req);
    scopedReq.query = { ...req.query, ...query };
    scopedReq.params = { ...req.params, ...params };

    let settled = false;
    const finish = (fn) => (...args) => {
      if (settled) return;
      settled = true;
      fn(...args);
    };

    const done = finish(resolve);
    const fail = finish(reject);

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        if (this.statusCode >= 400) {
          return fail(
            new AppError(payload?.message || 'The underlying service rejected the request.', this.statusCode)
          );
        }
        // House convention is { success, message, data } — unwrap to the data.
        return done(payload && Object.hasOwn(payload, 'data') ? payload.data : payload);
      },
      send(payload) {
        return this.json(payload);
      },
    };

    const next = (err) => fail(err instanceof Error ? err : new AppError(String(err), 500));

    Promise.resolve()
      .then(() => controllerFn(scopedReq, res, next))
      .catch(fail);
  });
