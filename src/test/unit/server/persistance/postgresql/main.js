const pgPersistence = require('../../../../../main/server/persistence/postgresql/index');
const Tests = require('../../persistence-tests');

const opts = {
  conString: 'postgres://postgres@localhost/synceddb',
};

Tests.testPersistence(pgPersistence.create.bind(null, opts));
