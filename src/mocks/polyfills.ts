type GlobalWithStubs = typeof globalThis & Record<string, unknown>;

function defineStubGlobal(name: string) {
  const target = globalThis as GlobalWithStubs;
  if (typeof target[name] !== 'undefined') {
    return;
  }
  target[name] = class {
    type: string;
    constructor(type: string, eventInitDict?: Record<string, unknown>) {
      this.type = type;
      Object.assign(this, eventInitDict);
    }
  };
}

['MessageEvent', 'Event', 'EventTarget', 'BroadcastChannel'].forEach(defineStubGlobal);
