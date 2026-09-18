// utils/asyncHandler.js
//
// Express 4 does not automatically catch rejected promises from an async
// route handler or middleware -- an unhandled rejection would just hang
// the request. Wrapping every async handler with this forwards any thrown
// error to next(), so Express's normal error handling takes over instead.

function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
