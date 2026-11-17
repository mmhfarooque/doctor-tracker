import mongoose from 'mongoose';

/** Shared counters survive serverless instance recycling. */
export class MongoRateLimitStore {
  constructor(namespace) {
    this.namespace = namespace;
    this.localKeys = false;
  }
  init({ windowMs }) { this.windowMs = windowMs; }
  get collection() { return mongoose.connection.collection('rate_limits'); }
  bucket(key) {
    const window = Math.floor(Date.now() / this.windowMs);
    return { id: `${this.namespace}:${window}:${key}`, resetTime: new Date((window + 1) * this.windowMs) };
  }
  async increment(key) {
    const { id, resetTime } = this.bucket(key);
    this.ready ??= this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((err) => {
      this.ready = null;
      throw err;
    });
    await this.ready;
    const result = await this.collection.findOneAndUpdate(
      { _id: id },
      { $inc: { hits: 1 }, $setOnInsert: { expiresAt: resetTime } },
      { upsert: true, returnDocument: 'after', includeResultMetadata: false }
    );
    return { totalHits: result.hits, resetTime };
  }
  async decrement(key) {
    await this.collection.updateOne({ _id: this.bucket(key).id, hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }
  async resetKey(key) { await this.collection.deleteOne({ _id: this.bucket(key).id }); }
}
