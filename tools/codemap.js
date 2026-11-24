import fs from 'fs';
import path from 'path';

const SRC_DIR = 'src';
const OUTPUT_FILE = 'CODEMAP.md';

const CONTROL_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'return',
  'else', 'do', 'try', 'finally', 'with',
  'case', 'default', 'break', 'continue', 'throw',
  'function', 'class', 'const', 'let', 'var', 'new', 'super', 'import', 'export'
]);

function getAllJsFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = filePath.replace(/\\/g, '/');
  const isDataFile = relPath.startsWith('src/data/');
  const entries = [];

  if (isDataFile) {
    // Untuk file data: cukup daftar export tingkat atas
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      // Match export const/let/var/function/class/default
      const exportMatch = trimmed.match(/^export\s+(?:default\s+)?(?:(const|let|var|function(?:\s*\*)?|async\s+function(?:\s*\*)?|class)\s+)?([A-Za-z0-9_$]+)/);
      if (exportMatch) {
        const kind = exportMatch[1] || '';
        const name = exportMatch[2];
        if (CONTROL_KEYWORDS.has(name) && name !== 'default') return;
        if (kind.includes('class')) {
          entries.push({ lineNum, name: `class ${name}` });
        } else {
          entries.push({ lineNum, name });
        }
      }
    });
    return { relPath, lines, entries };
  }

  // Non-data files (scenes, systems, entities, ui, main.js):
  let inClass = false;
  let classDepth = 0;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let line = lines[i];

    // Handle multi-line comments /* ... */
    if (inBlockComment) {
      const endComment = line.indexOf('*/');
      if (endComment !== -1) {
        inBlockComment = false;
        line = line.slice(endComment + 2);
      } else {
        continue;
      }
    }

    const trimmed = line.trim();

    // Check start of multi-line comment
    const startComment = line.indexOf('/*');
    if (startComment !== -1) {
      const endComment = line.indexOf('*/', startComment + 2);
      if (endComment === -1) {
        inBlockComment = true;
      }
    }

    // Top-level declarations (outside of class or before entering class)
    if (!inClass || classDepth === 0) {
      // 1. Class declaration
      const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?class\s+([A-Za-z0-9_$]+)/);
      if (classMatch) {
        entries.push({ lineNum, name: `class ${classMatch[1]}` });
        inClass = true;
      } else {
        // 2. Top-level function
        const funcMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function(?:\s*\*)?\s+([A-Za-z0-9_$]+)/);
        if (funcMatch) {
          entries.push({ lineNum, name: funcMatch[1] });
        } else {
          // 3. Top-level const / let (exported or major constants)
          const constMatch = trimmed.match(/^(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_$]+)\s*=/);
          if (constMatch) {
            const varName = constMatch[1];
            // Include if exported or UPPERCASE or config/game
            if (trimmed.startsWith('export') || /^[A-Z0-9_]+$/.test(varName) || ['config', 'game'].includes(varName)) {
              entries.push({ lineNum, name: varName });
            }
          }
        }
      }
    } else if (inClass && classDepth === 1) {
      // Direct class methods at class body level (classDepth === 1)
      // Ignore comments and empty lines
      if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
        // Match methods: constructor, methodName, _methodName, #privateMethod, static, async, get, set
        // Must be followed by ( or for getters/setters possibly without (
        const methodMatch = trimmed.match(/^(?:(static|async)\s+)?(?:(static|async)\s+)?(?:(get|set)\s+)?([_#A-Za-z0-9$]+)\s*\(/);
        if (methodMatch) {
          const methodName = methodMatch[4];
          if (!CONTROL_KEYWORDS.has(methodName) && !trimmed.startsWith('this.') && !trimmed.startsWith('super.')) {
            entries.push({ lineNum, name: methodName });
          }
        } else {
          // Check getter / setter without parens on the same line or standard getter: get foo() {
          const accessorMatch = trimmed.match(/^(?:static\s+)?(get|set)\s+([_#A-Za-z0-9$]+)\s*(?:\(\s*\))?\s*\{/);
          if (accessorMatch) {
            const accName = accessorMatch[2];
            if (!CONTROL_KEYWORDS.has(accName)) {
              entries.push({ lineNum, name: `${accessorMatch[1]} ${accName}` });
            }
          }
        }
      }
    }

    // Brace depth tracking for class scope
    // Strip comments and strings for brace counting
    let clean = line.replace(/\/\/.*$/, '');
    clean = clean.replace(/\/\*.*?\*\//g, '');
    clean = clean.replace(/'(?:[^'\\]|\\.)*'/g, "''");
    clean = clean.replace(/"(?:[^"\\]|\\.)*"/g, '""');
    clean = clean.replace(/`(?:[^`\\]|\\.)*`/g, '``');

    for (const char of clean) {
      if (char === '{') {
        if (inClass) {
          classDepth++;
        }
      } else if (char === '}') {
        if (inClass) {
          classDepth--;
          if (classDepth <= 0) {
            inClass = false;
            classDepth = 0;
          }
        }
      }
    }
  }

  return { relPath, lines, entries };
}

function generateCodemap() {
  const files = getAllJsFiles(SRC_DIR);
  const outLines = [
    'Dibuat otomatis oleh npm run codemap. Jangan dibaca penuh; gunakan grep -n <nama> CODEMAP.md lalu sed -n \'A,Bp\' <file>.'
  ];

  for (const file of files) {
    const { relPath, lines, entries } = parseFile(file);
    const stat = fs.statSync(file);
    const sizeKb = Math.ceil(stat.size / 1024);
    const lineCount = lines.length;

    outLines.push('');
    outLines.push(`## ${relPath} (${sizeKb} KB, ${lineCount} baris)`);

    // Ensure sorted by line number and remove duplicates if any
    entries.sort((a, b) => a.lineNum - b.lineNum);
    const seen = new Set();
    for (const entry of entries) {
      const key = `${entry.lineNum}:${entry.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        outLines.push(`L${entry.lineNum} ${entry.name}`);
      }
    }
  }

  outLines.push('');
  fs.writeFileSync(OUTPUT_FILE, outLines.join('\n'), 'utf8');
  console.log(`CODEMAP.md generated with ${files.length} files.`);
}

generateCodemap();
