const fs = require('fs');
const chalk = require('chalk');
const chokidar = require('chokidar');
const os = require('os');
const EventEmitter = require('events');

var Parser = class Parser extends EventEmitter {
  constructor(filePath, { debug: debug, autoUpdate: autoUpdate } = { debug: false, autoUpdate: null }) {
    super();
    this.filePath = filePath;
    this.debug = debug;
    this.autoUpdate = autoUpdate;
    this.watcher;
    this.autoUpdateTimerFn;
  }
  _initCursorPosFromFile() {
    fs.readFile(this.filePath, 'utf8', (err, data) => {
      this.cursorPos = data.length;
      this._debug(`Init at pos ${this.cursorPos}`);
    });
    return this;
  }
  _initWatcher() {
    this.watcher = chokidar.watch(this.filePath);
    return this;
  }
  _debug(msg, type = 'log') {
    if (this.debug) {
      console[type](chalk.red(`Parser: ${msg}`));
    }
    return this;
  }
  init() {
    this._debug('-- Initializing');
    this._initCursorPosFromFile();
    this._initWatcher();
    this._debug('-- Initialized --');
    return this;
  }
  stopAutoUpdateTimer() {
    this._debug('autoUpdate:stop');
    clearTimeout(this.autoUpdateTimerFn);
    return this;
  }
  startAutoUpdateTimer() {
    if (!!this.autoUpdate) {
      this._debug(`autoUpdate:start ${this.autoUpdate}ms`);
      this.autoUpdateTimerFn = setTimeout(() => {
        this._debug('emit:update');
        this.emit('update');
        this.startAutoUpdateTimer();
      }, this.autoUpdate);
    }
    return this;
  }
  start() {
    this._debug('-- Starting');
    this.startAutoUpdateTimer();
    this.watcher.on('change', (path, stats) => {
      // Nothing changed
      if (!stats || !stats.size || this.cursorPos === stats.size) {
        this._debug('file change skip');
        return;
      }
      var from = this.cursorPos === 0 ? 0 : this.cursorPos;
      var to = this.cursorPos = stats.size;
      this._debug(`from ${from} to ${to}`);
      fs.createReadStream('chat.log', { start: from, end: to }).on('data', (chunk) => {
        var txt = chunk.toString('utf8');
        txt.split(os.EOL).forEach((text) => {
          this.emit('data', text);
        });
      });
    });
    this._debug('-- Started --');
    return this;
  }
  close() {
    this._debug('-- Closing');
    this.stopAutoUpdateTimer();
    this.watcher.close();
    this._debug('-- Closed --');
    return this;
  }
};

module.exports = Parser;