'use strict';

const _ = require('lodash');

class PostgresqlDB {

  constructor(knex) {
    this.knex = knex;
  }

  get onSaveChange() {
    return {
      create: async (trx, change, data) => {
        change.version = 0;

        change.record.key = change.key;
        const db_obj = (await trx(change.storeName)
          .insert(change.record, '*'))[0]
        change.ref_obj = db_obj;
        change.ref_id = db_obj.id;

        data.record = _.assign({}, change.record, db_obj);
      },
      update: async (trx, change, data) => {
        data.diff = change.diff;
        change.version++;
      },
      delete: async (trx, change, data) => {
        change.version++;
      }
    }
  }
  
  async saveChange(change) {
    console.log('saveChange', change);
    
    const data = {};

    await this.knex.transaction(async trx => {
      await this.onSaveChange[change.type](trx, change, data);

      change.timestamp = await trx('synceddb_changes')
        .insert({
          key: change.key,
          version: change.version,
          storename: change.storeName,
          ref_id: change.ref_id,
          type: change.type,
          data: data
        })
        .returning('timestamp')
    })
    
    return change;
  }
  
  async getChanges(req) {
    console.log('getChanges', req);
    
    const since = req.since === null ? -1
      : Array.isArray(req.since) ? req.since[0]
      : req.since;
    
    const rows = await this.knex('synceddb_changes')
      .where('storename', req.storeName)
      .andWhere('timestamp', '>', since)
      .orderBy('timestamp');
    
    const result = rows.map(row => {
      row.data.key = row.key;
      row.data.timestamp = row.timestamp;
      row.data.storeName = row.storename;
      row.data.type = row.type;
      row.data.version = row.version;
      return row.data;
    });

    console.log(JSON.stringify(result, null, 2));
    
    return result
  }
  
  async resetChanges() {
    console.log('resetChanges');
    
    await this.knex('synceddb_changes').delete();
    await this.knex.raw('ALTER SEQUENCE department_user_id_seq RESTART WITH 4');
  }
}

module.exports = PostgresqlDB;
