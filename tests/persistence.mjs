import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
fs.mkdirSync('tests/output',{recursive:true});
const folder=fs.mkdtempSync(path.resolve('tests/output/persistence-')),database=path.join(folder,'original.sqlite'),backups=path.join(folder,'backups');
function cli(action,file=database){const r=spawnSync(process.execPath,['build/manage.mjs',action],{env:{...process.env,DATABASE_PATH:file,BACKUP_DIR:backups},encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
test('La CLI crea el esquema y valida las relaciones',()=>{assert.match(cli('check'),/Relaciones verificadas/);const db=new DatabaseSync(database);assert.equal(db.prepare('SELECT COUNT(*) n FROM schema_migrations').get().n,5);db.prepare('INSERT INTO settings VALUES(?,?)').run('persistence_test','Registro ficticio persistente');db.close();});
test('El respaldo es consistente y conserva los datos tras cerrar la conexión',()=>{cli('backup');const backup=path.join(backups,fs.readdirSync(backups)[0]);const db=new DatabaseSync(backup,{readOnly:true});assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(db.prepare("SELECT value FROM settings WHERE key='persistence_test'").get().value,'Registro ficticio persistente');assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);db.close();});
test('Una copia restaurada abre con migraciones intactas y el mismo registro',()=>{const restored=path.join(folder,'restaurada.sqlite');fs.copyFileSync(path.join(backups,fs.readdirSync(backups)[0]),restored);assert.match(cli('check',restored),/Relaciones verificadas/);const db=new DatabaseSync(restored,{readOnly:true});assert.equal(db.prepare("SELECT value FROM settings WHERE key='persistence_test'").get().value,'Registro ficticio persistente');db.close();});
