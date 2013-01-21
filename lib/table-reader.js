const Int64        = require('node-int64')

const kBlockHandleMaxEncodedLength = 10 + 10
    , kFooterEncodedLength         = 2 * kBlockHandleMaxEncodedLength + 8
    , kTableMagicNumber            = new Int64('db4775248b80fb57')

const fs           = require('fs')
    , EventEmitter = require('events').EventEmitter

var readTableFile = function (fd) {
    var ee = new EventEmitter()

    fs.fstat(fd, function (err, stats) {
      var footer = new Buffer(kFooterEncodedLength)
      fs.read(fd, footer, 0, kFooterEncodedLength, stats.size - kFooterEncodedLength, function (err, len) {
        if (err)
          return ee.emit('error', err)

        if (len != kFooterEncodedLength)
          return ee.emit('error', new Error('problem reading table file footer')) // eh?


        var magicLo = footer.readUInt32LE(kFooterEncodedLength - 8)
          , magicHi = footer.readUInt32LE(kFooterEncodedLength - 4)
          , magic   = new Int64(magicHi, magicLo)

        if (magic.toOctetString() != kTableMagicNumber.toOctetString())
          ee.emit('error', new Error('corrupt table file, bad magic number'))

        ee.emit('done')
      })
    })

    return ee
  }

module.exports = readTableFile