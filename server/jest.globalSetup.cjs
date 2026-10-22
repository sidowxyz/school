// jest.globalSetup.cjs
// This file runs BEFORE any test modules are loaded.
// It ensures environment variables from .env are loaded with the correct values.
const dotenv = require('dotenv');
const path = require('path');

module.exports = async function () {
  dotenv.config({ override: true, path: path.resolve(__dirname, '.env') });
  process.env.NODE_ENV = 'test';

  let dbUri = process.env.MONGODB_URI;
  if (dbUri) {
    if (dbUri.startsWith("MONGODB_URI=")) {
      dbUri = dbUri.replace("MONGODB_URI=", "");
    }
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
    process.env.MONGODB_URI = base + query;
  }
};
