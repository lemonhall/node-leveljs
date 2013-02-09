/*jshint bitwise:false*/

const Int64    = require('node-int64')
    , protobuf = require('./protobuf')

var BlockHandle = (function () {
      function BlockHandle (offset) {
        this.offset = offset
      }

      BlockHandle.prototype.equals = function(handle) {
        return this.offset === handle.offset
            && this.size === handle.size
      }

      return BlockHandle
    }())

  , readLengthPrefixedSlice = function (buf, pos) {
      var vi32   = protobuf.readVarInt32(buf, pos)
        , start  = pos + vi32[1]
        , offset = vi32[0] + vi32[1]
      return [ buf.slice(start, pos + offset), offset ]
    }

  , readFullInt64 = function (buf, pos) {
      var lo = buf.readUInt32LE(pos)
        , hi = buf.readUInt32LE(pos + 4)
      return new Int64(hi, lo)
    }

  , readBlockHandle = function (buf, pos) {
      var tmp    = protobuf.readVarInt64(buf, pos)
        , shift  = tmp[1]
        , handle = new BlockHandle(tmp[0])

      tmp = protobuf.readVarInt64(buf, pos + shift)
      handle.size = tmp[0]

      return [ handle, shift + tmp[1] ]
    }

  , extractUserKey = function (key) {
      return key.slice(0, key.length - 8)
    }

module.exports = {
    readLengthPrefixedSlice : readLengthPrefixedSlice
  , readFullInt64           : readFullInt64
  , readBlockHandle         : readBlockHandle
  , extractUserKey          : extractUserKey
}