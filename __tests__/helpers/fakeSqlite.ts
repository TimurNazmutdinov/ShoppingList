import initSqlJs from 'sql.js';

type Param = string | number | null;

// Подмена expo-sqlite для тестов: настоящий SQLite в памяти (sql.js) с теми методами, что использует приложение.
export async function openDatabaseAsync() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const all = (sql: string, params: Param[]) => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const out: Record<string, unknown>[] = [];
      while (stmt.step()) out.push(stmt.getAsObject());
      return out;
    } finally {
      stmt.free();
    }
  };

  return {
    execAsync: async (sql: string) => {
      db.exec(sql);
    },
    runAsync: async (sql: string, ...params: Param[]) => {
      db.run(sql, params);
      const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
      return { lastInsertRowId: Number(id), changes: db.getRowsModified() };
    },
    getAllAsync: async (sql: string, ...params: Param[]) => all(sql, params),
    getFirstAsync: async (sql: string, ...params: Param[]) => all(sql, params)[0] ?? null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
