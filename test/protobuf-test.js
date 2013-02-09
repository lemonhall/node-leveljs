var buster   = require('buster')
  , assert   = buster.assert
  , fs       = require('fs')
  , path     = require('path')
  , protobuf = require('../lib/protobuf')

buster.testCase('Protocol buffers', {
    'test varint64': function () {
      var buf = fs.readFileSync(path.join(__dirname, 'varint64.dat'))
        , pos = 0
        , i
        , vi

      while (pos < buf.length) {
        i  = Number(buf.toString('utf8', pos, pos += 16).trim())
        vi = protobuf.readVarInt64(buf, pos)
        assert.equals(vi[0], i)
        pos += vi[1]
      }
    }

  , 'test varint32': function () {
      var buf = fs.readFileSync(path.join(__dirname, 'varint32.dat'))
        , pos = 0
        , i
        , vi

      while (pos < buf.length) {
        i  = Number(buf.toString('utf8', pos, pos += 16).trim())
        vi = protobuf.readVarInt32(buf, pos)
        assert.equals(vi[0], i)
        pos += vi[1]
      }
    }
})