import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";

// Some home/office resolvers fail mongodb+srv SRV lookups. Set MONGO_DNS_SERVERS
// (e.g. "8.8.8.8,1.1.1.1") to use other resolvers; hosts like Render don't need it.
if (process.env.MONGO_DNS_SERVERS) {
  try {
    dns.setServers(process.env.MONGO_DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean));
  } catch (err) {
    console.warn("Warning: Could not set DNS servers:", err.message);
  }
}

/**
 * Strips the password out of a Mongo connection string for logging.
 *
 * "mongodb+srv://user:secret@host/db" -> "user@host"
 *
 * Returns a fixed placeholder rather than the input if the URI does not parse,
 * so a malformed value can never fall through and print its own secret.
 */
const redactUri = (uri) => {
  const match = /^mongodb(?:\+srv)?:\/\/([^:/?#]+)(?::[^@]*)?@([^/?#]+)/.exec(uri ?? "");
  return match ? `${match[1]}@${match[2]}` : "(credentials hidden)";
};

// Never override already-set process.env vars: this file used to pass
// { override: true }, which silently discarded any MONGODB_URI/PORT/NODE_ENV
// set on the command line (e.g. for pointing a manual run at a test
// database) and fell back to .env's values instead — including .env's
// production MONGODB_URI. dotenv's default (no override) leaves anything
// already in process.env alone and only fills in what's missing.
dotenv.config();

const connectDB = async () => {
  try {
    let dbUri = process.env.MONGODB_URI || process.env.MONGO_URI
      || (process.env.NODE_ENV === 'production' ? null : 'mongodb://127.0.0.1:27017/school_management_system');
    if (!dbUri) throw new Error('MONGODB_URI is not set');

    // Clean up if MONGODB_URI= was accidentally prepended in the env variable
    if (dbUri.startsWith("MONGODB_URI=")) {
      dbUri = dbUri.replace("MONGODB_URI=", "");
    }

    if (process.env.NODE_ENV === 'test') {
      const parts = dbUri.split('?');
      let base = parts[0];
      const query = parts[1] ? `?${parts[1]}` : '';
      const protoIndex = base.indexOf('://');
      const slashIndex = base.lastIndexOf('/');

      if (slashIndex > protoIndex + 2) {
        base = base.substring(0, slashIndex) + '/SMS_Test';
      } else {
        base = base.endsWith('/') ? `${base}SMS_Test` : `${base}/SMS_Test`;
      }
      dbUri = base + query;
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log("Connecting to MongoDB...");
    }

    const conn = await mongoose.connect(dbUri, {
      // Atlas M0 (free tier) clusters idle down and can take 10-20s to wake —
      // measured at 16s from a cold start on this project. The previous 5s
      // budget made the server start with no database and every request fail
      // with "buffering timed out", which reads like a broken app rather than
      // a slow first connection. Overridable for CI, which wants to fail fast.
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 30000,
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 30000,
    });

    if (process.env.NODE_ENV !== 'test') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      console.log(`MongoDB Database: ${conn.connection.name}`);
      // Never print the raw URI — it embeds the database password, which then
      // lands in terminal scrollback, CI logs and screenshots. Host and
      // database name are logged above and are all that is needed to confirm
      // the right environment.
      console.log(`MongoDB User: ${redactUri(dbUri)}`);
      console.log('connectDB: MongoDB connection established successfully.');
    }

    return true;
  } catch (error) {
    console.warn(`MongoDB connection unavailable: ${error.message}`);
    console.warn('Continuing without a database connection so the server can still start. Configure MONGODB_URI or start MongoDB to enable persistence.');
    return false;
  }
};

export default connectDB;
