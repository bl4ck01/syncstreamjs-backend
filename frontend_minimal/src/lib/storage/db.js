import Dexie from 'dexie';

export class IPTVDatabase extends Dexie {
  constructor() {
    super('IPTVDatabase');
    this.version(1).stores({
      categories: 'id, stream_type, category_id',
      streams: 'id, categoryId, category_id, stream_type, num, series_id, rating, genre',
    });
  }
}

export const db = new IPTVDatabase();