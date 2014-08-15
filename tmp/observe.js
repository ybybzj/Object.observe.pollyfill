(function ( global ) {

var rAF;
rAF = function () {
  var lastTime = 0;
  var vendors = [
      'webkit',
      'moz',
      'ms',
      'o'
    ];
  var requestAnimationFrame = global.requestAnimationFrame, cancelAnimationFrame = global.cancelAnimationFrame;
  for (var x = 0; x < vendors.length && !global.requestAnimationFrame; ++x) {
    requestAnimationFrame = global[vendors[x] + 'RequestAnimationFrame'];
    cancelAnimationFrame = global[vendors[x] + 'CancelAnimationFrame'] || global[vendors[x] + 'CancelRequestAnimationFrame'];
  }
  if (!requestAnimationFrame)
    requestAnimationFrame = function (callback) {
      var currTime = Date.now ? Date.now() : new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = global.setTimeout(function () {
          callback(currTime + timeToCall);
        }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  if (!cancelAnimationFrame)
    cancelAnimationFrame = function (id) {
      clearTimeout(id);
    };
  return {
    requestAnimationFrame: requestAnimationFrame,
    cancelAnimationFrame: cancelAnimationFrame
  };
}();
var utils;
utils = function (rAF) {
  function toString(o) {
    return Object.prototype.toString.call(o);
  }
  function hasOwn(o, k) {
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
  var defer = global.setImmediate || rAF.requestAnimationFrame || global.setTimeout, clearDefer = global.clearImmediate || rAF.cancelAnimationFrame || global.clearTimeout;
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
    };
  var oDef = function (o, k, v, mode) {
    mode = mode || 'default';
    var defObj = { value: v }, writable = defModeMap[mode]['writable'], enumerable = defModeMap[mode]['enumerable'], configurable = defModeMap[mode]['configurable'];
    if (writable != null)
      defObj['writable'] = writable;
    if (enumerable != null)
      defObj['enumerable'] = enumerable;
    if (configurable != null)
      defObj['configurable'] = configurable;
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
    nextTick: function (cb) {
      return defer.call(global, cb);
    },
    clearTick: function (id) {
      return clearDefer.call(global, id);
    },
    oDef: oDef,
    createHash: function () {
      return Object.create(null);
    }
  };
}(rAF);
var weakMap;
weakMap = function () {
  var WeakMapShim, HIDDEN_PREFIX, counter, getOwnPropertyNameOrg, mascot = {};
  if (typeof WeakMap !== 'undefined') {
    WeakMapShim = WeakMap;
  } else {
    HIDDEN_PREFIX = '__weakmap:' + (Math.random() * 1000000000 >>> 0);
    counter = new Date().getTime() % 1000000000;
    WeakMapShim = function () {
      this.name = HIDDEN_PREFIX + (Math.random() * 1000000000 >>> 0) + (counter++ + '__');
    };
    WeakMapShim.prototype = {
      has: function (key) {
        return key && Object.prototype.hasOwnProperty.call(key, this.name);
      },
      get: function (key) {
        var value = key && key[this.name];
        return value === mascot ? undefined : value;
      },
      set: function (key, value) {
        Object.defineProperty(key, this.name, {
          value: typeof value === 'undefined' ? mascot : value,
          enumerable: false,
          writable: true,
          configurable: true
        });
      },
      'delete': function (key) {
        return delete key[this.name];
      }
    };
    getOwnPropertyNameOrg = Object.getOwnPropertyNames;
    Object.defineProperty(Object, 'getOwnPropertyNames', {
      value: function fakeGetOwnPropertyNames(obj) {
        return getOwnPropertyNameOrg(obj).filter(function (name) {
          return name.indexOf(HIDDEN_PREFIX) === 0;
        });
      },
      writable: true,
      enumerable: false,
      configurable: true
    });
  }
  return WeakMapShim;
}();
var referenceMap;
referenceMap = function (WeakMap) {
  return {
    observerCallbacks: [],
    notifierMap: new WeakMap(),
    // store corresponding notifier to an object
    changeObserversMap: new WeakMap(),
    activeChangesMap: new WeakMap(),
    pendingChangesMap: new WeakMap(),
    // store reference to a list of pending changeRecords in observer callback.
    attachedNotifierCountMap: new WeakMap(),
    // store a count of associated notifier to a function
    watchedObjectMap: new WeakMap()
  };
}(weakMap);
/**
 * Object.observe API implementation according to
 * [The harmony proposal page](http://wiki.ecmascript.org/doku.php?id=harmony:observe)*
 */
var observe;
observe = function (Utils, refMap) {
  // An ordered list used to provide a deterministic ordering in which callbacks are called.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#observercallbacks)
  var observerCallbacks = refMap.observerCallbacks, notifierMap = refMap.notifierMap, changeObserversMap = refMap.changeObserversMap, activeChangesMap = refMap.activeChangesMap, pendingChangesMap = refMap.pendingChangesMap, attachedNotifierCountMap = refMap.attachedNotifierCountMap;
  // Used to store immediate uid reference
  var changeDeliveryImmediateUid;
  // Used to schedule a call to _deliverAllChangeRecords
  function setUpChangesDelivery() {
    Utils.clearTick(changeDeliveryImmediateUid);
    changeDeliveryImmediateUid = Utils.nextTick(_deliverAllChangeRecords);
  }
  // This object is used as the prototype of all the notifiers that are returned by Object.getNotifier(O).
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#notifierprototype)
  var NotifierPrototype = Object.create(Object.prototype);
  Utils.oDef(NotifierPrototype, 'notify', _notify, 'hidden');
  Utils.oDef(NotifierPrototype, 'performChange', _performChange, 'hidden');
  //[Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#notifierprototype_.notify)
  function _notify(changeRecord) {
    var notifier = this;
    if (!Utils.isObject(notifier))
      _throwTypeError('this', 'Object', notifier);
    if (!notifier.__target)
      return;
    if (!Utils.isObject(changeRecord))
      _throwTypeError('changeRecord', 'Object', changeRecord);
    var type = changeRecord.type;
    if (!Utils.isString(type))
      _throwTypeError('changeRecord.type', 'String', type);
    var changeObservers = changeObserversMap.get(notifier);
    if (!changeObservers || changeObservers.length === 0)
      return;
    var target = notifier.__target, newRecord = {}, propName;
    Utils.oDef(newRecord, 'object', target, 'immutable');
    for (propName in changeRecord) {
      if (propName !== 'object') {
        Utils.oDef(newRecord, propName, changeRecord[propName], 'immutable');
      }
    }
    Object.preventExtensions(newRecord);
    _enqueueChangeRecord(target, newRecord);
  }
  //[Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#notifierprototype_.performchange)
  function _performChange(changeType, changeFn) {
    var notifier = this, target, error, changeRecord, changeObservers, newRecord, propName;
    if (!Utils.isObject(notifier))
      _throwTypeError('this', 'Object', notifier);
    if (!(target = notifier.__target))
      return;
    if (!Utils.isString(changeType))
      _throwTypeError('changeType', 'String', changeType);
    if (!Utils.isCallable(changeFn))
      _throwTypeError('changeFn', 'Function', changeFn);
    _beginChange(target, changeType);
    try {
      changeRecord = changeFn.call(Utils.createHash());
    } catch (err) {
      error = err;
    }
    _endChange(target, changeType);
    if (error != null)
      throw error;
    if (changeRecord === false)
      return;
    changeObservers = changeObserversMap.get(notifier);
    if (!changeObservers || changeObservers.length === 0)
      return;
    newRecord = {};
    Utils.oDef(newRecord, 'object', target, 'immutable');
    Utils.oDef(newRecord, 'type', changeType, 'immutable');
    if (changeRecord != null) {
      for (propName in changeRecord) {
        if (propName !== 'object' && propName !== 'type') {
          Utils.oDef(newRecord, propName, changeRecord[propName], 'immutable');
        }
      }
    }
    Object.preventExtensions(newRecord);
    _enqueueChangeRecord(target, newRecord);
  }
  // Implementation of the internal algorithm 'BeginChange'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#beginchange)
  function _beginChange(object, changeType) {
    var notifier = _getNotifier(object), activeChanges = activeChangesMap.get(notifier), changeCount = activeChangesMap.get(notifier)[changeType];
    activeChanges[changeType] = typeof changeCount === 'undefined' ? 1 : changeCount + 1;
  }
  // Implementation of the internal algorithm 'EndChange'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#endchange)
  function _endChange(object, changeType) {
    var notifier = _getNotifier(object), activeChanges = activeChangesMap.get(notifier), changeCount = activeChangesMap.get(notifier)[changeType];
    activeChanges[changeType] = changeCount > 0 ? changeCount - 1 : 0;
  }
  // Implementation of the internal algorithm 'ShouldDeliverToObserver'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#shoulddelivertoobserver)
  function _shouldDeliverToObserver(activeChanges, acceptList, changeType) {
    var doesAccept = false;
    if (acceptList) {
      for (var i = 0, l = acceptList.length; i < l; i++) {
        var accept = acceptList[i];
        if (activeChanges[accept] > 0) {
          return false;
        }
        if (accept === changeType) {
          doesAccept = true;
        }
      }
    }
    return doesAccept;
  }
  // Implementation of the internal algorithm 'GetNotifier'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#getnotifier)
  function _getNotifier(target) {
    if (!notifierMap.has(target)) {
      var notifier = Object.create(NotifierPrototype);
      // we does not really need to hide this, since anyway the host object is accessible from outside of the
      // implementation. we just make it unwritable
      Object.defineProperty(notifier, '__target', { value: target });
      changeObserversMap.set(notifier, []);
      activeChangesMap.set(notifier, {});
      notifierMap.set(target, notifier);
    }
    return notifierMap.get(target);
  }
  // Implementation of the internal algorithm 'EnqueueChangeRecord'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#enqueuechangerecord)
  function _enqueueChangeRecord(object, changeRecord) {
    var notifier = _getNotifier(object), changeType = changeRecord.type, activeChanges = activeChangesMap.get(notifier), changeObservers = changeObserversMap.get(notifier);
    for (var i = 0, l = changeObservers.length; i < l; i++) {
      var observerRecord = changeObservers[i], acceptList = observerRecord.accept;
      if (_shouldDeliverToObserver(activeChanges, acceptList, changeType)) {
        var observer = observerRecord.callback, pendingChangeRecords = [];
        if (!pendingChangesMap.has(observer)) {
          pendingChangesMap.set(observer, pendingChangeRecords);
        } else {
          pendingChangeRecords = pendingChangesMap.get(observer);
        }
        pendingChangeRecords.push(changeRecord);
      }
    }
    setUpChangesDelivery();
  }
  // Remove reference all reference to an observer callback,
  // if this one is not used anymore.
  // In the proposal the ObserverCallBack has a weak reference over observers,
  // Without this possibility we need to clean this list to avoid memory leak
  function _cleanObserver(observer) {
    if (!attachedNotifierCountMap.get(observer) && !pendingChangesMap.has(observer)) {
      attachedNotifierCountMap.delete(observer);
      var index = observerCallbacks.indexOf(observer);
      if (index !== -1) {
        observerCallbacks.splice(index, 1);
      }
    }
  }
  // Implementation of the internal algorithm 'DeliverChangeRecords'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#deliverchangerecords)
  function _deliverChangeRecords(observer) {
    var pendingChangeRecords = pendingChangesMap.get(observer), error;
    pendingChangesMap.delete(observer);
    if (!pendingChangeRecords || pendingChangeRecords.length === 0) {
      return false;
    }
    try {
      observer.call(Utils.createHash(), pendingChangeRecords);
    } catch (e) {
      error = e;
    } finally {
      _cleanObserver(observer);
    }
    if (error != null)
      throw error;
    return true;
  }
  // Implementation of the internal algorithm 'DeliverAllChangeRecords'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#deliverallchangerecords)
  function _deliverAllChangeRecords() {
    var observers = observerCallbacks.slice();
    var anyWorkDone = false;
    for (var i = 0, l = observers.length; i < l; i++) {
      var observer = observers[i];
      if (_deliverChangeRecords(observer)) {
        anyWorkDone = true;
      }
    }
    return anyWorkDone;
  }
  // Implementation of the public api 'Object.observe'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.observe)
  function observe(target, callback, accept) {
    var notifier, changeObservers;
    if (!Utils.isObjectType(target))
      _throwTypeError('target', 'ObjectType', target);
    if (!Utils.isCallable(callback))
      _throwTypeError('observer', 'Function', callback);
    if (Object.isFrozen(callback)) {
      throw new TypeError('observer cannot be frozen');
    }
    if (!Utils.isArray(accept)) {
      accept = [
        'add',
        'update',
        'delete',
        'reconfigure',
        'setPrototype',
        'preventExtensions'
      ];
    } else {
      accept = accept.filter(function (item) {
        return Utils.isString(item);
      });
    }
    notifier = _getNotifier(target);
    changeObservers = changeObserversMap.get(notifier);
    for (var i = 0, l = changeObservers.length; i < l; i++) {
      if (changeObservers[i].callback === callback) {
        changeObservers[i].accept = accept;
        return target;
      }
    }
    changeObservers.push({
      callback: callback,
      accept: accept
    });
    if (observerCallbacks.indexOf(callback) === -1) {
      observerCallbacks.push(callback);
    }
    if (!attachedNotifierCountMap.has(callback)) {
      attachedNotifierCountMap.set(callback, 1);
    } else {
      attachedNotifierCountMap.set(callback, attachedNotifierCountMap.get(callback) + 1);
    }
    return target;
  }
  // Implementation of the public api 'Object.deliverChangeRecords'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.deliverchangerecords)
  function unobserve(target, callback) {
    if (!Utils.isObjectType(target))
      _throwTypeError('target', 'ObjectType', target);
    if (!Utils.isCallable(callback))
      _throwTypeError('observer', 'Function', callback);
    var notifier = _getNotifier(target), changeObservers = changeObserversMap.get(notifier);
    for (var i = 0, l = changeObservers.length; i < l; i++) {
      if (changeObservers[i].callback === callback) {
        changeObservers.splice(i, 1);
        attachedNotifierCountMap.set(callback, attachedNotifierCountMap.get(callback) - 1);
        _cleanObserver(callback);
        break;
      }
    }
    return target;
  }
  // Implementation of the public api 'Object.getNotifier'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.getnotifier)
  function deliverChangeRecords(observer) {
    if (!Utils.isCallable(observer))
      _throwTypeError('observer', 'Function', observer);
    while (_deliverChangeRecords(observer)) {
    }
  }
  // Implementation of the public api 'Object.getNotifier'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.getnotifier)
  function getNotifier(target) {
    if (!Utils.isObjectType(target))
      _throwTypeError('target', 'ObjectType', target);
    if (Object.isFrozen(target))
      return null;
    return _getNotifier(target);
  }
  //helpers
  function _throwTypeError(targetName, desiredType, target) {
    throw new TypeError(targetName + ' must be one of [' + desiredType + '], but received ' + target);
  }
  return {
    observe: observe,
    unobserve: unobserve,
    getNotifier: getNotifier
  };
}(utils, referenceMap);
var batch;
batch = function (Utils) {
  function Batch(opts) {
    opts = opts || {};
    if (!Utils.isObject(opts)) {
      throw new TypeError('[Batch initialize]: parameter need to be a object! But given ' + opts);
    }
    var options = this.options = {
        maxExecutingTime: null,
        iterateCount: 1,
        //1, or number or 'infinite'
        allowDup: true
      }, cb = opts.onFlush;
    Object.keys(options).forEach(function (key) {
      var optsVal;
      if (Utils.hasOwn(opts, key)) {
        optsVal = opts[key];
        switch (key) {
        case 'maxExecutingTime':
          if (Utils.isNumeric(optsVal)) {
            options[key] = optsVal < 10 ? 10 : Math.round(optsVal);
          } else {
            throw new TypeError('[Batch initialize options]: "maxExecutingTime" option need to be a numeric type, but given ' + optsVal);
          }
          break;
        case 'iterateCount':
          if (Utils.isNumeric(optsVal)) {
            options[key] = optsVal < 1 ? 1 : Math.round(optsVal);
          } else if (optsVal === 'infinite') {
            options[key] = optsVal;
          } else {
            throw new TypeError('[Batch initialize options]: "iterateCount" option need to be a positive number or "infinite", but given ' + optsVal);
          }
          break;
        default:
          options[key] = optsVal;
        }
      }
    });
    this._cb = Utils.isCallable(cb) ? cb : function () {
    };
    this._iterateCount = this.options.iterateCount;
    this._queue = [];
    this._startPos = 0;
  }
  Batch.prototype.addTarget = function (target) {
    var allowDup = !!this.options.allowDup, oldLen = this._queue.length;
    this._iterateCount = this.options.iterateCount;
    if (allowDup) {
      this._queue.push(target);
    } else {
      if (this._queue.indexOf(target) === -1) {
        this._queue.push(target);
      }
    }
    if (oldLen === 0 && this._queue.length === 1) {
      this.scheduleFlush();
    }
    return this;
  };
  Batch.prototype.removeTarget = function (target) {
    var idx = this._queue.indexOf(target);
    if (idx !== -1)
      this._queue.splice(idx, 1);
    return this;
  };
  Batch.prototype.flush = function () {
    var maxExecutingTime = this.options.maxExecutingTime, takingTooLong = false, startTime = new Date(), cb = this._cb, startPos = this._startPos, iterateCount = this._iterateCount, task, _i, _len, _ref;
    _ref = this._queue;
    for (_i = startPos, _len = _ref.length; _i < _len; _i++) {
      task = _ref[_i];
      cb.call(null, task);
      if (maxExecutingTime) {
        takingTooLong = new Date() - startTime > maxExecutingTime;
        if (takingTooLong) {
          _i++;
          break;
        }
      }
    }
    if (iterateCount === 1) {
      this._queue.splice(0, _i);
      this._startPos = 0;
    } else {
      this._startPos = _i < _len ? _i : 0;
    }
    if (Utils.isNumeric(iterateCount) && iterateCount > 1 && this._startPos === 0) {
      this._iterateCount -= 1;
    }
    if (this._queue.length) {
      this.scheduleFlush();
    }
  };
  Batch.prototype.scheduleFlush = function () {
    this._tick = Utils.nextTick(function (_this) {
      return function () {
        return _this.flush();
      };
    }(this));
    return this._tick;
  };
  Batch.prototype.onFlush = function (fn) {
    if (!Utils.isCallable(fn)) {
      throw new TypeError('[Batch.prototype.onFlush]need a Function here, but given ' + fn);
    }
    this._cb = fn;
    return this;
  };
  Batch.prototype.length = function () {
    return this._queue.length;
  };
  Batch.prototype.stop = function (immediate) {
    if (immediate) {
      this._queue = [];
      Utils.clearTick(this._tick);
    } else {
      this._iterateCount = 1;
      this._queue.splice(0, this._startPos);
      this._startPos = 0;
    }
    return this;
  };
  return Batch;
}(utils);
var arrayObserve;
arrayObserve = function (OB, Utils) {
  var mutationFns = [
      'splice',
      'pop',
      'shift',
      'unshift',
      'push'
    ], wrappedMutationFn = Object.create(Array.prototype);
  mutationFns.forEach(wrapMutation);
  function ArrayObserve(array, observer) {
    argumentMutationFns(array);
    return OB.observe(array, observer, [
      'update',
      'add',
      'delete',
      'splice'
    ]);
  }
  function ArrayUnobserve(array, observer) {
    restoreMutationFn(array);
    return OB.unobserve(array, observer);
  }
  function argumentMutationFns(array) {
    if (!array.__mutateWatched__) {
      Utils.oDef(array, '__mutateWatched__', true, 'hidden');
      mutationFns.forEach(function (fnName) {
        Utils.oDef(array, fnName, wrappedMutationFn[fnName], 'hidden');
      });
    }
    return array;
  }
  function restoreMutationFn(array) {
    if (array.__mutateWatched__) {
      mutationFns.forEach(function (fnName) {
        delete array[fnName];
      });
    }
    delete array.__mutateWatched__;
    return array;
  }
  function wrapMutation(fnName) {
    Utils.oDef(wrappedMutationFn, fnName, function () {
      var original = Array.prototype[fnName], arrObj = this, notifier = OB.getNotifier(this), arrObjLen = arrObj.length, args, argsLen, index, inserted, removed, result;
      args = Array.prototype.slice.call(arguments);
      argsLen = args.length;
      inserted = [];
      removed = [];
      notifier.performChange('splice', function () {
        var spliceIdx;
        switch (fnName) {
        case 'push':
          index = arrObjLen;
          inserted = range(arrObjLen, arrObjLen + argsLen - 1);
          break;
        case 'unshift':
          index = 0;
          inserted = range(0, argsLen - 1);
          break;
        case 'pop':
          index = arrObjLen - 1;
          removed = [arrObjLen - 1];
          break;
        case 'shift':
          index = 0;
          removed = [0];
          break;
        case 'splice':
          spliceIdx = args[0] < 0 ? arrObjLen + args[0] : args[0];
          spliceIdx = spliceIdx < 0 ? 0 : spliceIdx;
          index = spliceIdx;
          if (argsLen === 1) {
            removed = range(spliceIdx, arrObjLen - 1);
          } else if (argsLen === 2) {
            if (args[1] > 0) {
              removed = range(spliceIdx, spliceIdx + args[1] - 1);
            }
          } else {
            if (args[1] > 0) {
              removed = range(spliceIdx, spliceIdx + args[1] - 1);
            }
            inserted = range(spliceIdx, spliceIdx + args.slice(2).length - 1);
          }
        }
        result = original.apply(arrObj, args);
        if (arrObj.length !== arrObjLen) {
          return {
            method: fnName,
            inserted: inserted,
            removed: removed,
            index: index
          };
        } else {
          return false;
        }
      });
      return result;
    });
  }
  function range(start, end) {
    var i, _i, _results;
    _results = [];
    for (i = _i = start; start <= end ? _i <= end : _i >= end; i = start <= end ? ++_i : --_i) {
      _results.push(i);
    }
    return _results;
  }
  return {
    observe: ArrayObserve,
    unobserve: ArrayUnobserve
  };
}(observe, utils);
var index;
index = function (OB, Utils, rfM, Batch, ArrOB) {
  var watchedObjectMap = rfM.watchedObjectMap, propertiesWatchedPool = new Batch({
      maxExecutingTime: 100,
      iterateCount: 'infinite',
      allowDup: false,
      onFlush: _checkPropertyListing
    });
  function wrapObservable(o) {
    var notifier = OB.getNotifier(o);
    if (!watchedObjectMap.has(notifier)) {
      watchedObjectMap.set(notifier, {
        properties: [],
        values: []
      });
      _checkPropertyListing(o, true);
      propertiesWatchedPool.addTarget(o);
    }
    return o;
  }
  function wrapProperty(o, key) {
    var descriptor = Object.getOwnPropertyDescriptor(o, key), notifier = OB.getNotifier(o), update, values, properties, watchedObj, oldVal;
    if (key === 'getNotifier' || Utils.isAccessorDescriptor(descriptor) || !descriptor.enumerable) {
      return false;
    }
    watchedObj = watchedObjectMap.get(notifier);
    properties = watchedObj.properties;
    values = watchedObj.values;
    properties.push(key);
    values.push(o[key]);
    oldVal = values[values.length - 1];
    if (!(Utils.isArray(o) && Utils.isNumeric(key))) {
      Object.defineProperty(o, key, {
        enumerable: true,
        configurable: true,
        get: function () {
          return oldVal;
        },
        set: function (val) {
          if (!Utils.isSameValue(val, oldVal)) {
            notifier.notify({
              type: 'update',
              name: key,
              oldValue: oldVal
            });
            values[values.length - 1] = val;
          }
        }
      });
    }
    return true;
  }
  restore = function (o) {
    var notifier = OB.getNotifier(o), watchedObj = watchedObjectMap.get(notifier), properties = watchedObj.properties, values = watchedObj.values, i, l;
    if (!Utils.isArray(o)) {
      for (i = 0, l = properties.length; i < l; i++) {
        Utils.oDef(o, properties[i], values[i]);
      }
    }
    watchedObjectMap['delete'](notifier);
    propertiesWatchedPool.removeTarget(o);
    return o;
  };
  function _checkPropertyListing(o, dontNotify) {
    var notifier = OB.getNotifier(o), keys = Object.keys(o), watchedObj = watchedObjectMap.get(notifier), properties = watchedObj.properties, values = watchedObj.values, oldKeys = properties.slice(0), newKeys = [], updates = [], doNotify = !dontNotify, isArray = Utils.isArray(o), i, len, key, val, propIdx, aLength;
    if (isArray) {
      if (properties.indexOf('length') === -1) {
        properties.push('length');
        values.push(o.length);
      }
    }
    for (i = 0, len = keys.length; i < len; i++) {
      key = keys[i];
      val = o[key];
      if ((propIdx = properties.indexOf(key)) === -1) {
        if (wrapProperty(o, key) && doNotify) {
          notifier.notify({
            type: 'add',
            name: key
          });
        }
      } else {
        if (isArray && Utils.isNumeric(key)) {
          if (!Utils.isSameValue(values[propIdx], val)) {
            if (doNotify) {
              notifier.notify({
                type: 'update',
                name: key,
                oldValue: values[propIdx]
              });
            }
            values[propIdx] = val;
          }
        }
        oldKeys.splice(oldKeys.indexOf(key), 1);
      }
    }
    if (doNotify) {
      if (isArray) {
        oldKeys.splice(oldKeys.indexOf('length'), 1);
      }
      len = oldKeys.length;
      for (i = 0; i < len; i++) {
        propIdx = properties.indexOf(oldKeys[i]);
        notifier.notify({
          type: 'delete',
          name: oldKeys[i],
          oldValue: values[propIdx]
        });
        properties.splice(propIdx, 1);
        values.splice(propIdx, 1);
      }
      if (isArray) {
        propIdx = properties.indexOf('length');
        aLength = values[propIdx];
        if (aLength !== o.length) {
          notifier.notify({
            type: 'update',
            name: 'length',
            oldValue: aLength
          });
          values[propIdx] = o.length;
        }
      }
    }
  }
  return {
    observe: Object.observe || function (o, observer, accept) {
      wrapObservable(o);
      OB.observe(o, observer, accept);
      return o;
    },
    unobserve: Object.unobserve || function (o, observer) {
      OB.unobserve(o, observer);
      restore(o);
      return o;
    },
    getNotifier: Object.getNotifier || OB.getNotifier,
    ArrayObserve: ArrOB.observe,
    ArrayUnobserve: ArrOB.unobserve
  };
}(observe, utils, referenceMap, batch, arrayObserve);
// export as Common JS module...
if ( typeof module !== "undefined" && module.exports ) {
        module.exports = index;
}

// ... or as AMD module
else if ( typeof define === "function" && define.amd ) {
        define( function () {
                return index;
        });
}

// ... or as browser global
else {
        utils.oDef(Object, 'observe', index.observe);
        utils.oDef(Object, 'unobserve', index.unobserve);
        utils.oDef(Object, 'getNotifier', index.getNotifier);
        utils.oDef(Array, 'observe', index.ArrayObserve);
        utils.oDef(Array, 'unobserve', index.ArrayUnobserve);

}

}( typeof window !== 'undefined' ? window : this ));