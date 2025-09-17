import Dexie from 'dexie';

export class IPTVDatabase extends Dexie {
  constructor() {
    super('IPTVDatabase');
    this.version(1).stores({
      // Categories table: primary index + compound indexes for efficient queries
      categories: 'id, [stream_type+category_id], stream_type, category_name, category_id',
      
      // Streams table: optimized for the queries used in the app
      streams: 'id, categoryId, [categoryId+stream_id], stream_type, [stream_type+category_id], name, rating, genre, releaseDate',
    });
  }
}

export const db = new IPTVDatabase();