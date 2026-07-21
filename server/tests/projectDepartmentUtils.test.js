const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDepartmentSelection, serializeDepartmentSelection } = require('../utils/projectDepartmentUtils');

test('normalizes arrays and comma-separated strings into unique department ids', () => {
  assert.deepStrictEqual(normalizeDepartmentSelection(['2', ' 1 ', '2']), ['2', '1']);
  assert.deepStrictEqual(normalizeDepartmentSelection(' 3, 1 ,3 '), ['3', '1']);
  assert.deepStrictEqual(normalizeDepartmentSelection(''), []);
});

test('serializes department selection as a JSON array', () => {
  assert.strictEqual(serializeDepartmentSelection(['2', ' 1 ', '2']), '["2","1"]');
  assert.strictEqual(serializeDepartmentSelection(''), '[]');
});
