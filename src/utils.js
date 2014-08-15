define(['./rAF'], function(rAF) {
  function toString(o) {
    return Object.prototype.toString.call(o);
  }

  function hasOwn(o, k){
    return Object.prototype.hasOwnProperty.call(o, k);
  }

  function isArray(o) {
    return Array.isArray ? Array.isArray(o) : toString(o) === '[object Array]';
  }

  function isObject(o) {
    return toString(o) === '[object Object]';
  }

  function isObjectType(o) {
    return Object(o) === o;
  }

  function isString(o) {
    return toString(o) === '[object String]';
  }

  function isCallable(o) {
    return toString(o) === '[object Function]';
  }

  function isNumeric(o) {
    return !isNaN(parseFloat(o)) && isFinite(o);
  }

  function isSameValue(x, y) {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y;
    }
    return x !== x && y !== y;
  }

  function isAccessorDescriptor(desc) {
    return isObject(desc) && ('get' in desc || 'set' in desc);
  }

  function isDataDescriptor(desc) {
    return isObject(desc) && ('value' in desc || 'writable' in desc);
  }
  var defer = global.setImmediate || rAF.requestAnimationFrame || global.setTimeout,
    clearDefer = global.clearImmediate || rAF.cancelAnimationFrame || global.clearTimeout;
  var defModeMap = {
    'default': {
      writable: true,
      configurable: true
    },
    'hidden': {
      writable: true,
      enumerable: false,
      configurable: true
    },
    'immutable': {
      writable: false,
      enumerable: true,
      configurable: false
    }
  }
  var oDef = function(o, k, v, mode) {
    mode = mode || 'default';
    var defObj = {
      value: v
    },
      writable = defModeMap[mode]['writable'],
      enumerable = defModeMap[mode]['enumerable'],
      configurable = defModeMap[mode]['configurable'];
    if (writable != null) defObj['writable'] = writable;
    if (enumerable != null) defObj['enumerable'] = enumerable;
    if (configurable != null) defObj['configurable'] = configurable;
    return Object.defineProperty(o, k, defObj);
  };
  return {
    toString: toString,
    isString: isString,
    isArray: isArray,
    isObject: isObject,
    isObjectType: isObjectType,
    isCallable: isCallable,
    isNumeric: isNumeric,
    isSameValue: isSameValue,
    isAccessorDescriptor: isAccessorDescriptor,
    isDataDescriptor: isDataDescriptor,
    hasOwn: hasOwn,
    nextTick: function(cb) {
      return defer.call(global, cb);
    },
    clearTick: function(id) {
      return clearDefer.call(global, id);
    },
    oDef: oDef,
    createHash: function() {
      return Object.create(null);
    }
  };
});