const protobuf     = require('./protobuf')
    , coding       = require('./coding')

    , ZERO_BUFFER  = new Buffer('')
var _i = 0
function Iterator (block) {
  this._i = _i++
  this._block         = block
  this.key            = null
  this._restartIndex  = 0
  this._currentOffset = 0
  this.value          = this._block.buffer.slice(0, 0)
}

Iterator.prototype.valid = function () {
  return this._currentOffset < this._block.restartOffset
}

Iterator.prototype.next = function (callback) {
  callback(null, this._parseNextKey(), this.key, this.value)
}

Iterator.prototype._nextEntryOffset = function () {
  return (this.value.offset - this._block.buffer.offset) + this.value.length
}

Iterator.prototype._seekToRestart = function (index) {
  this.key            = null
  this._restartIndex  = index
  this._currentOffset = this._block.restarts[index]
  this.value          = this._block.buffer.slice(this._currentOffset, 0)
}

Iterator.prototype.seekToFirst = function (callback) {
  this._seekToRestart(0)
  this._parseNextKey()
  callback()
}

Iterator.prototype._parseNextKey = function () {
  this._currentOffset = this._nextEntryOffset()

  if (this._currentOffset >= this._block.restartOffset) {
    this._currentOffset = this._block.restartOffset
    this._restartIndex  = this._block.restarts.length
    return false
  }

var pos = this._currentOffset
  var tmp = protobuf.readVarInt32(this._block.buffer, this._currentOffset)
    , shared = tmp[0]
    , nonShared
    , valueLength

  this._currentOffset += tmp[1]
  tmp = protobuf.readVarInt32(this._block.buffer, this._currentOffset)
  this._currentOffset += tmp[1]
  nonShared = tmp[0]
  tmp = protobuf.readVarInt32(this._block.buffer, this._currentOffset)
  this._currentOffset += tmp[1]
  valueLength = tmp[0]
  console.log(this._i, pos, 'shared', shared, 'nonShared', nonShared, 'valueLength', valueLength)

  if (false && shared !== 0)
    throw new Error('unable to deal with shared keys yet')

  if (nonShared > 0) {
    this.key = this._block.buffer.slice(this._currentOffset, this._currentOffset + nonShared)
    this._currentOffset += nonShared
    this.value = this._block.buffer.slice(this._currentOffset, this._currentOffset + valueLength)

    while (this._restartIndex + 1 < this._block.restarts.length
          && this._block.restarts[this._restartIndex + 1] < this._currentOffset)
        ++this._restartIndex;

    return true
  }


  return false
}

function Block (buffer) {
  this.buffer = buffer
  this.restarts = []

  var numRestarts = this.buffer.readUInt32LE(this.buffer.length - 4)
    , i = 0

  this.restartOffset = this.buffer.length - (1 + numRestarts) * 4

  for (; i < numRestarts; i++)
    this.restarts.push(this.buffer.readUInt32LE(this.restartOffset + i * 4))
}

Block.prototype.inspect = function () {
  return JSON.stringify({ restarts: this.restarts })
}

Block.prototype.iterator = function () {
  return new Iterator(this)
}

module.exports = Block