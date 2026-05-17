const fs = require('fs');
const path = require('path');

class Recorder {
  constructor() {
    this.replaysDir = path.join(__dirname, '..', '..', 'replays');
    if (!fs.existsSync(this.replaysDir)) {
      fs.mkdirSync(this.replaysDir);
    }
  }

  isRecordingWindow() {
    const now = new Date();
    // Format the time in BRT (America/Sao_Paulo)
    const options = { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(now);

    let hour = 0;
    let minute = 0;
    for (const part of parts) {
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }

    const timeFloat = hour + (minute / 60);
    let windows = [];
    
    try {
      const windowsPath = path.join(__dirname, '..', 'data', 'recording_windows.json');
      if (fs.existsSync(windowsPath)) {
        windows = JSON.parse(fs.readFileSync(windowsPath, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading recording windows config:', err);
    }

    for (const win of windows) {
      if (timeFloat >= win.start && timeFloat <= win.end) {
        return win.name;
      }
    }

    return null;
  }

  record(payload, weather) {
    const windowName = this.isRecordingWindow();
    if (!windowName) return;

    // Save as JSON lines to allow streaming without reading the whole file
    const filePath = path.join(this.replaysDir, `replay_${windowName}.jsonl`);
    const line = JSON.stringify({ timestamp: Date.now(), data: payload, weather: weather }) + '\n';

    fs.appendFile(filePath, line, (err) => {
      if (err) console.error('Failed to write replay data:', err);
    });
  }
}

module.exports = new Recorder();
