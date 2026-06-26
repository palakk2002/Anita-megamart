import fs from 'fs';
import path from 'path';

try {
  const filePath = path.resolve('out.txt');
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf16le');
    const lines = content.split('\n');
    console.log(`Total lines: ${lines.length}`);
    console.log("Last 100 lines:");
    console.log(lines.slice(-100).join('\n'));
  } else {
    console.log("out.txt does not exist in current directory.");
  }
} catch (error) {
  console.error("Error reading file:", error);
}
