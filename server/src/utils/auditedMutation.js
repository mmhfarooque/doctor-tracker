import mongoose from 'mongoose';

// Mongoose propagates the transaction session to every operation in the callback.
mongoose.set('transactionAsyncLocalStorage', true);

/** Send success only after both clinical writes and their audit entries commit. */
export const auditedMutation = (handler) => async (req, res, next) => {
  try {
    let status = 200;
    let body;
    const reply = {
      status(code) { status = code; return this; },
      json(value) { body = value; return this; },
    };
    await mongoose.connection.transaction(async () => {
      // A transaction callback can be retried by MongoDB.
      status = 200;
      body = undefined;
      await handler(req, reply, (err) => { throw err; });
    });
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
};
