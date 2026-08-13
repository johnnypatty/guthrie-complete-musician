import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryIndexedDB } from './support/memory-indexeddb.mjs';

await import('../src/js/indexed-db-adapter.js');
const IndexedDbAdapter = globalThis.IndexedDbAdapter;

test('commits successful multi-store transactions and keeps the database version independent', async () => {
  const database = await IndexedDbAdapter.open({ indexedDB: createMemoryIndexedDB(), name: 'adapter-commit', version: 17 });
  await database.transaction(['sessions', 'attempts'], 'readwrite', async (tx) => {
    await tx.add('sessions', { id: 'session-1', minutes: 30 });
    await tx.add('attempts', { id: 'attempt-1', sessionId: 'session-1' });
  });

  assert.equal(database.version, 17);
  assert.deepEqual(await database.getAll('sessions'), [{ id: 'session-1', minutes: 30 }]);
  assert.deepEqual(await database.getAll('attempts'), [{ id: 'attempt-1', sessionId: 'session-1' }]);
});

test('aborts a transaction on a duplicate key without committing its earlier writes', async () => {
  const database = await IndexedDbAdapter.open({ indexedDB: createMemoryIndexedDB(), name: 'adapter-abort', version: 2 });
  await database.add('sessions', { id: 'existing' });

  await assert.rejects(
    database.transaction(['sessions'], 'readwrite', async (tx) => {
      await tx.add('sessions', { id: 'new-record' });
      await tx.add('sessions', { id: 'existing' });
    }),
    /already exists/i
  );

  assert.deepEqual(await database.getAll('sessions'), [{ id: 'existing' }]);
});

test('aborts an explicit failure without persisting any write', async () => {
  const database = await IndexedDbAdapter.open({ indexedDB: createMemoryIndexedDB(), name: 'adapter-explicit-abort', version: 2 });

  await assert.rejects(
    database.transaction(['meta'], 'readwrite', async (tx) => {
      await tx.put('meta', { id: 'progress', week: 9 });
      throw new Error('do not save');
    }),
    /do not save/i
  );

  assert.equal(await database.get('meta', 'progress'), undefined);
});

test('rejects a transaction request issued after an unrelated await lets IndexedDB auto-complete', async () => {
  const database = await IndexedDbAdapter.open({ indexedDB: createMemoryIndexedDB(), name: 'adapter-lifetime', version: 2 });

  await assert.rejects(
    database.transaction(['meta'], 'readwrite', async (tx) => {
      await tx.get('meta', 'progress');
      await new Promise((resolve) => setTimeout(resolve, 0));
      await tx.put('meta', { id: 'progress', week: 9 });
    }),
    /inactive|finished/i
  );

  assert.equal(await database.get('meta', 'progress'), undefined);
});

test('auto-completes an initially empty transaction before delayed work queues its first request', async () => {
  const database = await IndexedDbAdapter.open({ indexedDB: createMemoryIndexedDB(), name: 'adapter-empty-lifetime', version: 2 });

  await assert.rejects(
    database.transaction(['meta'], 'readwrite', async (tx) => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      await tx.put('meta', { id: 'progress', week: 9 });
    }),
    /inactive|finished/i
  );
});

test('rejects writes in readonly transactions', async () => {
  const database = await IndexedDbAdapter.open({ indexedDB: createMemoryIndexedDB(), name: 'adapter-readonly', version: 2 });

  await assert.rejects(
    database.transaction(['meta'], 'readonly', (tx) => tx.put('meta', { id: 'progress' })),
    /readonly/i
  );
});

test('rejects requests made after a transaction completes or aborts', async () => {
  const database = await IndexedDbAdapter.open({ indexedDB: createMemoryIndexedDB(), name: 'adapter-finished', version: 2 });
  let completed;
  await database.transaction(['meta'], 'readwrite', async (tx) => {
    completed = tx;
    await tx.put('meta', { id: 'progress' });
  });

  await assert.rejects(Promise.resolve().then(() => completed.put('meta', { id: 'late' })), /inactive|finished/i);

  let aborted;
  await assert.rejects(database.transaction(['sessions'], 'readwrite', (tx) => {
    aborted = tx;
    throw new Error('stop');
  }), /stop/i);
  await assert.rejects(Promise.resolve().then(() => aborted.put('sessions', { id: 'late' })), /inactive|finished/i);
});
