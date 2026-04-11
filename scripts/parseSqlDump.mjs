#!/usr/bin/env node
/**
 * Parses the adiman-dev SQL dump and exports as JSON.
 * Input:  scripts/sources/husn_ms_id.sql
 * Output: scripts/sources/husn_ms_id_parsed.json
 * 
 * Structure: { groups: [{ id, ar_title, en_title, ms_title, in_title }],
 *              duas: [{ id, group_id, ar_dua, ar_reference, en_translation, en_reference, ms_translation, ms_reference, in_translation, in_reference }] }
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SQL_PATH = join(import.meta.dirname, 'sources', 'husn_ms_id.sql');
const OUT_PATH = join(import.meta.dirname, 'sources', 'husn_ms_id_parsed.json');

const sql = readFileSync(SQL_PATH, 'utf8');

function parseSqlInserts(sql, tableName) {
  const rows = [];
  const regex = new RegExp(`^INSERT INTO "${tableName}" VALUES \\((.+)\\);$`, 'gm');
  let match;
  
  while ((match = regex.exec(sql)) !== null) {
    const valuesStr = match[1];
    const values = [];
    let current = '';
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < valuesStr.length; i++) {
      const ch = valuesStr[i];
      
      if (escape) {
        current += ch;
        escape = false;
        continue;
      }
      
      if (ch === "'") {
        if (inString && valuesStr[i + 1] === "'") {
          // Escaped quote in SQL
          current += "'";
          i++;
          continue;
        }
        inString = !inString;
        continue;
      }
      
      if (ch === ',' && !inString) {
        values.push(current.trim());
        current = '';
        continue;
      }
      
      current += ch;
    }
    values.push(current.trim());
    
    // Convert NULL to null, numbers to numbers
    const cleaned = values.map(v => {
      if (v === 'NULL') return null;
      if (/^\d+$/.test(v)) return parseInt(v, 10);
      return v;
    });
    
    rows.push(cleaned);
  }
  
  return rows;
}

// Parse groups
const groupRows = parseSqlInserts(sql, 'dua_group');
const groups = groupRows.map(row => ({
  id: row[0],
  ar_title: row[1],
  en_title: row[2],
  ms_title: row[3],
  in_title: row[4],
}));

// Parse duas
const duaRows = parseSqlInserts(sql, 'dua');
const duas = duaRows.map(row => ({
  id: row[0],
  group_id: row[1],
  ar_dua: row[2],
  ar_reference: row[3],
  en_translation: row[4],
  en_reference: row[5],
  ms_translation: row[6],
  ms_reference: row[7],
  in_translation: row[8],
  in_reference: row[9],
}));

const result = { groups, duas };

writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');
console.log(`Parsed ${groups.length} groups, ${duas.length} duas`);
console.log(`Written to ${OUT_PATH}`);
