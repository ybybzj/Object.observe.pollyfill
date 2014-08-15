define(['./observe', './utils', './referenceMap', './batch', './arrayObserve'], function(OB, Utils, rfM, Batch, ArrOB) {
  var watchedObjectMap = rfM.watchedObjectMap,
    propertiesWatchedPool = new Batch({
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
  };

  function wrapProperty(o, key) {
    var descriptor = Object.getOwnPropertyDescriptor(o, key),
      notifier = OB.getNotifier(o),
      update, values, properties, watchedObj, oldVal;
    if ((key === 'getNotifier') || Utils.isAccessorDescriptor(descriptor) || (!descriptor.enumerable)) {
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
        get: function() {
          return oldVal;
        },
        set: function(val) {
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
  };
  restore = function(o) {
    var notifier = OB.getNotifier(o),
      watchedObj = watchedObjectMap.get(notifier),
      properties = watchedObj.properties,
      values = watchedObj.values,
      i, l;
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
    var notifier = OB.getNotifier(o),
      keys = Object.keys(o),
      watchedObj = watchedObjectMap.get(notifier),
      properties = watchedObj.properties,
      values = watchedObj.values,
      oldKeys = properties.slice(0),
      newKeys = [],
      updates = [],
      doNotify = !dontNotify,
      isArray = Utils.isArray(o),
      i, len,
      key, val,
      propIdx,
      aLength;
    if (isArray) {
      if ((properties.indexOf('length')) === -1) {
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
    observe: Object.observe || function(o, observer, accept) {
      wrapObservable(o);
      OB.observe(o, observer, accept);
      return o;
    },
    unobserve: Object.unobserve || function(o, observer) {
      OB.unobserve(o, observer);
      restore(o);
      return o;
    },
    getNotifier: Object.getNotifier || OB.getNotifier,
    ArrayObserve: ArrOB.observe,
    ArrayUnobserve: ArrOB.unobserve
  }
});