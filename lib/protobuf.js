/*jshint bitwise:false*/

var readVarInt64 = function (buf, pos) {
      var res    = 0
        , offset = pos
        , shift  = 0
        , b

      do {
        b = buf.readUInt8(offset++)
        res += shift < 28
          ? (b & 0x7f) << shift
          : (b & 0x7f) * Math.pow(2, shift)
        shift += 7
      } while (b >= 0x80)
      return [ offset, res ]
    }

  , readVarInt32 = function (buf, pos) {
      var res    = 0
        , offset = pos
        , shift = 0
        , b

      do {
        b = buf.readUInt8(offset++)
        res += (b & 0x7f) << shift
        if (!(b & 128) || shift == 28)
          break
        shift += 7
      } while (b >= 0x80)
      return [ offset, res ]
    }

  , readLengthPrefixedSlice = function (buf, pos) {
      var vi32 = readVarInt32(buf, pos)
      return [ buf.slice(pos + vi32[0], pos + vi32[0] + vi32[1]), vi32[0] + vi32[1] ]
    }

module.exports = {
    readVarInt64            : readVarInt64
  , readVarInt32            : readVarInt32
  , readLengthPrefixedSlice : readLengthPrefixedSlice
}