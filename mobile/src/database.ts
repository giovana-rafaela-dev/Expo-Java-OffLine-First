import * as SQLite from 'expo-sqlite';

export type Pessoa = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  sincronizado: number;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('offline-first.db');
  }

  return dbPromise;
}

export async function initDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS pessoas (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      email TEXT,
      telefone TEXT,
      cidade TEXT,
      sincronizado INTEGER NOT NULL DEFAULT 0
    );
  `);

  const colunas = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(pessoas)`
  );

  const temColunaCidade = colunas.some((coluna) => coluna.name === 'cidade');

  if (!temColunaCidade) {
    await db.execAsync(`ALTER TABLE pessoas ADD COLUMN cidade TEXT;`);
  }
}

export async function inserirPessoa(
  id: string,
  nome: string,
  email: string,
  telefone: string,
  cidade: string
) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO pessoas
      (id, nome, email, telefone, cidade, sincronizado)
     VALUES (?, ?, ?, ?, ?, 0)`,
    id,
    nome,
    email,
    telefone,
    cidade
  );
}

export async function listarPessoas() {
  const db = await getDatabase();

  return db.getAllAsync<Pessoa>(
    `SELECT id, nome, email, telefone, cidade, sincronizado
       FROM pessoas
      ORDER BY rowid DESC`
  );
}

export async function listarPendentes() {
  const db = await getDatabase();

  return db.getAllAsync<Pessoa>(
    `SELECT id, nome, email, telefone, cidade, sincronizado
       FROM pessoas
      WHERE sincronizado = 0
      ORDER BY rowid`
  );
}

export async function marcarComoSincronizada(id: string) {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE pessoas
        SET sincronizado = 1
      WHERE id = ?`,
    id
  );
}
