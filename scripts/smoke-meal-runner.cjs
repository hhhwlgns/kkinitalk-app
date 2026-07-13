const Module = require('module');
const path = require('path');

const TARGET = '@react-native-async-storage/async-storage';
const SHIM = path.join(__dirname, 'fakeAsyncStorage.cjs');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === TARGET) {
    return SHIM;
  }
  return originalResolve.call(this, request, ...rest);
};

require(path.join(__dirname, '..', '.smoke-tmp', 'scripts', 'smoke-meal.js'));
