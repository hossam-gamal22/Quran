const fs = require('fs');
const code = fs.readFileSync('app/(tabs)/tasbih.tsx', 'utf8');
const lines = code.split('\n');
let stack = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip lines that are comments
  if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
  
  const opens = [...line.matchAll(/<([A-Z][A-Za-z.]*)[^>]*(?<!\/)>/g)];
  for (const m of opens) {
    stack.push({ tag: m[1], line: i+1 });
  }
  const closes = [...line.matchAll(/<\/([A-Z][A-Za-z.]*)\s*>/g)];
  for (const m of closes) {
    if (stack.length > 0 && stack[stack.length-1].tag === m[1]) {
      stack.pop();
    } else {
      console.log(`MISMATCH line ${i+1}: </${m[1]}> but expected </${stack.length > 0 ? stack[stack.length-1].tag : 'EMPTY'}> (opened at line ${stack.length > 0 ? stack[stack.length-1].line : '?'})`);
      // Try to find matching tag in stack
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].tag === m[1]) {
          console.log(`  -> Found matching <${m[1]}> at line ${stack[j].line}, popping ${stack.length - j} items`);
          stack.splice(j);
          break;
        }
      }
    }
  }
}
if (stack.length > 0) {
  console.log('UNCLOSED tags:');
  stack.forEach(s => console.log(`  <${s.tag}> at line ${s.line}`));
} else {
  console.log('All tags balanced');
}
