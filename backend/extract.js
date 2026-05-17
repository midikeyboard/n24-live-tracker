const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node extract.js <path_to_log_file>');
  process.exit(1);
}

const txt = fs.readFileSync(path.resolve(inputFile), 'utf8');
const searchStr = '{\n    "PID": "0"';
const start = txt.lastIndexOf(searchStr);

if (start > -1) {
  let end = txt.indexOf('</USER_REQUEST>', start);
  if (end > -1) {
    let jsonStr = txt.substring(start, end).trim();
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3).trim();
    }
    // Remove the divider if it exists
    if (jsonStr.includes('-----------------------------')) {
      jsonStr = jsonStr.split('-----------------------------').pop().trim();
    }
    
    // Attempt to parse it to ensure it's valid
    try {
      JSON.parse(jsonStr);
      fs.writeFileSync('src/data/live.json', jsonStr);
      console.log('Extracted JSON, length:', jsonStr.length);
    } catch(e) {
      console.log('JSON parse error:', e.message);
      // It might be truncated. Let's find the last valid "}"
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace > -1) {
        let fixed = jsonStr.substring(0, lastBrace + 1);
        try {
          JSON.parse(fixed);
          fs.writeFileSync('src/data/live.json', fixed);
          console.log('Extracted and fixed JSON, length:', fixed.length);
        } catch(e2) {
          console.log('Still unparsable');
        }
      }
    }
  } else {
    console.log('end not found');
  }
} else {
  console.log('start not found');
}
