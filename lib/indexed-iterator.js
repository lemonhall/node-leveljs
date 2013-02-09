// a.k.a two level iterator
const coding = require('./coding')

function IndexedIterator (indexIterator, dataIteratorFn) {
  this._indexIterator   = indexIterator
  this._dataIteratorFn  = dataIteratorFn
  this._dataIterator    = null
  this._key             = null
  this._value           = null
  this._dataBlockHandle = null

  this.__defineGetter__('key', function() {
    return this._dataIterator.key
  })
  this.__defineGetter__('value', function() {
    return this._dataIterator.value
  })
}

IndexedIterator.prototype.valid = function () {
  return this._dataIterator && this._dataIterator.valid()
}

IndexedIterator.prototype.seekToFirst = function (callback) {
  this._indexIterator.seekToFirst(function (err) {
    if (err)
      return callback(err)

    this._initDataBlock(function (err) {
      if (err)
        return callback(err)

      var complete = this._skipEmptyBlocksForward.bind(this, callback)

      if (this._dataIterator)
        return this._dataIterator.seekToFirst(complete)

      complete()
    }.bind(this))
  }.bind(this))
}

IndexedIterator.prototype.next = function (callback) {
  this._dataIterator.next(function (err, ok, key, value) {
    if (err)
      return callback(err)

    this._skipEmptyBlocksForward(function (err) {
      if (err)
        return callback(err)

      callback(null, ok, key, value)
    }.bind(this))
  }.bind(this))
}

IndexedIterator.prototype._skipEmptyBlocksForward = function (callback) {
  var loop = function (callback) {
        if (this._dataIterator != null && this._dataIterator.valid())
          return callback()

        if (!this._indexIterator.valid()) {
          this._dataIterator = null
          return callback()
        }

        this._indexIterator.next(function (err) {
          if (err)
            return callback(err)

          this._initDataBlock(function (err) {
            if (err)
              return callback(err)

            var complete = process.nextTick.bind(process, loop.bind(this, callback))

            if (this._dataIterator != null)
              return this._dataIterator.seekToFirst(complete)

            complete()
          }.bind(this))
        }.bind(this))
      }.bind(this)

  loop(callback)
}

IndexedIterator.prototype._initDataBlock = function (callback) {
  if (!this._indexIterator.valid()) {
    this._dataIterator = null
    return callback()
  }

  // NOTE: it'd be more efficient to just store the buffer and compare
  // buffer but we can't do that with Node core; so instead we convert
  // and compare
  var handle = coding.readBlockHandle(this._indexIterator.value, 0)[0]
  //TODO: do we care about [1]--offset?
  if (!this._dataIterator || !this._dataBlockHandle.equals(handle)) {
    this._dataBlockHandle = handle
    this._dataIteratorFn(handle, function (err, iterator) {
      if (err)
        return callback(err)

      this._dataIterator = iterator
      callback()
    }.bind(this))
  } else { // else already initialised this handle
    callback()
  }
}

module.exports = IndexedIterator