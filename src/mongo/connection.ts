import mongoose from 'mongoose';

const DEFAULT_MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DEFAULT_DB_NAME = process.env.MONGO_DB || 'qa';

export async function connectMongo(url: string = DEFAULT_MONGO_URL, dbName: string = DEFAULT_DB_NAME) {
  // If the URL already contains query params, assume it's a complete URI and do not append DB.
  // If the URL already has a path component after the host, also do not append DB.
  let uri = url;
  try {
    const u = new URL(url);
    const hasPath = u.pathname && u.pathname !== '/' && u.pathname.length > 1;
    const hasQuery = !!u.search;
    if (!hasQuery && !hasPath) {
      uri = url.endsWith('/') ? `${url}${dbName}` : `${url}/${dbName}`;
    }
  } catch {
    // Fallback for non-standard URLs: append dbName conservatively if no '?' present
    if (!url.includes('?') && !url.match(/\/[^/?#]+$/)) {
      uri = url.endsWith('/') ? `${url}${dbName}` : `${url}/${dbName}`;
    }
  }
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
