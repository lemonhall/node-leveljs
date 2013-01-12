/*jshint bitwise:false*/

var readVarInt32 = function (buf, pos) {
      var result = buf.readUInt8(pos)
        , offset = 0
        , b


      if ((result & 128) === 0)
        return [ 1, result ]

      result = 0
      for (var shift = 0; shift <= 28; shift += 7) {
        b = buf.readUInt8(pos + offset++)
        if (b & 128) {
          result |= ((b & 127) << shift);
        } else {
          result |= (b << shift);
          return [ offset, result ]
        }
      }
    }

  , readLengthPrefixedSlice = function (buf, pos) {
      var vi32 = readVarInt32(buf, pos)
      return [ buf.slice(pos + vi32[0], pos + vi32[0] + vi32[1]), vi32[0] + vi32[1] ]
    }

module.exports = {
    readLengthPrefixedSlice : readLengthPrefixedSlice
}