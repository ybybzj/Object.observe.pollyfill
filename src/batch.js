define(['./utils'], function(Utils) {
  function Batch(opts) {
    opts = opts || {};
    if (!Utils.isObject(opts)) {
      throw new TypeError('[Batch initialize]: parameter need to be a object! But given ' + opts);
    }
    var options = this.options = {
      maxExecutingTime: null,
      iterateCount: 1, //1, or number or 'infinite'
      allowDup: true
    },
      cb = opts.onFlush;
    Object.keys(options).forEach(function(key) {
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
    this._cb = Utils.isCallable(cb) ? cb : function() {};
    this._iterateCount = this.options.iterateCount;
    this._queue = [];
    this._startPos = 0;
  }
  Batch.prototype.addTarget = function(target) {
    var allowDup = !! this.options.allowDup,
      oldLen = this._queue.length;
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
  Batch.prototype.removeTarget = function(target) {
    var idx = this._queue.indexOf(target);
    if (idx !== -1) this._queue.splice(idx, 1);
    return this;
  };
  Batch.prototype.flush = function() {
    var maxExecutingTime = this.options.maxExecutingTime,
      takingTooLong = false,
      startTime = new Date(),
      cb = this._cb,
      startPos = this._startPos,
      iterateCount = this._iterateCount,
      task, _i, _len, _ref;
    _ref = this._queue;
    for (_i = startPos, _len = _ref.length; _i < _len; _i++) {
      task = _ref[_i];
      cb.call(null, task);
      if (maxExecutingTime) {
        takingTooLong = ((new Date()) - startTime) > maxExecutingTime;
        if (takingTooLong) {
          _i++;
          break;
        }
      }
    }
    if (iterateCount === 1) {
      this._queue.splice(0, _i);
      this._startPos = 0;
    }else{
      this._startPos = _i < _len ? _i : 0;
    }

    if (Utils.isNumeric(iterateCount) && iterateCount > 1 && this._startPos === 0) {
      this._iterateCount -= 1;
    }

    if (this._queue.length) {
      this.scheduleFlush();
    }
  };
  Batch.prototype.scheduleFlush = function() {
    this._tick = Utils.nextTick((function(_this) {
      return function() {
        return _this.flush();
      };
    })(this));
    return this._tick;
  };
  Batch.prototype.onFlush = function(fn) {
    if (!Utils.isCallable(fn)) {
      throw new TypeError('[Batch.prototype.onFlush]need a Function here, but given ' + fn);
    }
    this._cb = fn;
    return this;
  };
  Batch.prototype.length = function() {
    return this._queue.length;
  };
  Batch.prototype.stop = function(immediate) {
    if (immediate) {
      this._queue = [];
      Utils.clearTick(this._tick);
    } else {
      this._iterateCount = 1;
      this._queue.splice(0, this._startPos);
      this._startPos = 0;
    }
    return this;
  }
  return Batch;
});