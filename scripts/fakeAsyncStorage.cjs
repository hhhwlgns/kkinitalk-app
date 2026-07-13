const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, '..', '.smoke-tmp', 'fake-async-storage.json');

function readDisk() {
  if (!fs.existsSync(FILE_PATH)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
}

function writeDisk(data) {
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(data));
}

const fakeAsyncStorage = {
  async getItem(key) {
    const data = readDisk();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
  },
  async setItem(key, value) {
    const data = readDisk();
    data[key] = value;
    writeDisk(data);
  },
  async removeItem(key) {
    const data = readDisk();
    delete data[key];
    writeDisk(data);
  },
};

module.exports = { __esModule: true, default: fakeAsyncStorage };
