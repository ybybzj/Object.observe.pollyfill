/**
 * Object.observe API implementation according to
 * [The harmony proposal page](http://wiki.ecmascript.org/doku.php?id=harmony:observe)*
 */
define(['./utils', './referenceMap'], function(Utils, refMap) {
  // An ordered list used to provide a deterministic ordering in which callbacks are called.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#observercallbacks)
  var observerCallbacks = refMap.observerCallbacks,
    notifierMap = refMap.notifierMap,
    changeObserversMap = refMap.changeObserversMap,
    activeChangesMap = refMap.activeChangesMap,
    pendingChangesMap = refMap.pendingChangesMap,
    attachedNotifierCountMap = refMap.attachedNotifierCountMap;
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
    if (!Utils.isObject(notifier)) _throwTypeError('this', 'Object', notifier);
    if (!notifier.__target) return;
    if (!Utils.isObject(changeRecord)) _throwTypeError('changeRecord', 'Object', changeRecord);
    var type = changeRecord.type;
    if (!Utils.isString(type)) _throwTypeError('changeRecord.type', 'String', type);
    var changeObservers = changeObserversMap.get(notifier);
    if (!changeObservers || changeObservers.length === 0) return;
    var target = notifier.__target,
      newRecord = {},
      propName;
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
    var notifier = this,
      target, error, changeRecord,
      changeObservers, newRecord,
      propName;
    if (!Utils.isObject(notifier)) _throwTypeError('this', 'Object', notifier);
    if (!(target = notifier.__target)) return;
    if (!Utils.isString(changeType)) _throwTypeError('changeType', 'String', changeType);
    if (!Utils.isCallable(changeFn)) _throwTypeError('changeFn', 'Function', changeFn);
    _beginChange(target, changeType);
    try {
      changeRecord = changeFn.call(Utils.createHash());
    } catch (err) {
      error = err;
    }
    _endChange(target, changeType);
    if (error != null) throw error;
    if(changeRecord === false) return;

    changeObservers = changeObserversMap.get(notifier);
    if (!changeObservers || changeObservers.length === 0) return;
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
    var notifier = _getNotifier(object),
      activeChanges = activeChangesMap.get(notifier),
      changeCount = activeChangesMap.get(notifier)[changeType];
    activeChanges[changeType] = typeof changeCount === 'undefined' ? 1 : changeCount + 1;
  }
  // Implementation of the internal algorithm 'EndChange'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_internals#endchange)
  function _endChange(object, changeType) {
    var notifier = _getNotifier(object),
      activeChanges = activeChangesMap.get(notifier),
      changeCount = activeChangesMap.get(notifier)[changeType];
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
      Object.defineProperty(notifier, '__target', {
        value: target
      });
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
    var notifier = _getNotifier(object),
      changeType = changeRecord.type,
      activeChanges = activeChangesMap.get(notifier),
      changeObservers = changeObserversMap.get(notifier);
    for (var i = 0, l = changeObservers.length; i < l; i++) {
      var observerRecord = changeObservers[i],
        acceptList = observerRecord.accept;
      if (_shouldDeliverToObserver(activeChanges, acceptList, changeType)) {
        var observer = observerRecord.callback,
          pendingChangeRecords = [];
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
    var pendingChangeRecords = pendingChangesMap.get(observer),
      error;
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
    if (error != null) throw error;
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
    if (!Utils.isObjectType(target)) _throwTypeError('target', 'ObjectType', target);
    if (!Utils.isCallable(callback)) _throwTypeError('observer', 'Function', callback);
    if (Object.isFrozen(callback)) {
      throw new TypeError('observer cannot be frozen');
    }
    if (!Utils.isArray(accept)) {
      accept = ['add', 'update', 'delete', 'reconfigure', 'setPrototype', 'preventExtensions'];
    } else {
      accept = accept.filter(function(item) {
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
    if (!Utils.isObjectType(target)) _throwTypeError('target', 'ObjectType', target);
    if (!Utils.isCallable(callback)) _throwTypeError('observer', 'Function', callback);
    var notifier = _getNotifier(target),
      changeObservers = changeObserversMap.get(notifier);
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
    if (!Utils.isCallable(observer)) _throwTypeError('observer', 'Function', observer);
    while (_deliverChangeRecords(observer)) {}
  }
  // Implementation of the public api 'Object.getNotifier'
  // described in the proposal.
  // [Corresponding Section in ECMAScript wiki](http://wiki.ecmascript.org/doku.php?id=harmony:observe_public_api#object.getnotifier)
  function getNotifier(target){
    if(!Utils.isObjectType(target)) _throwTypeError('target', 'ObjectType', target);
    if(Object.isFrozen(target)) return null;

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
});