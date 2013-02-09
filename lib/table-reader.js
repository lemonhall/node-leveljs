const fs              = require('fs')
    , EventEmitter    = require('events').EventEmitter
    , Int64           = require('node-int64')
    , coding          = require('./coding')
    , protobuf        = require('./protobuf')
    , Block           = require('./block')
    , IndexedIterator = require('./indexed-iterator')

const kBlockHandleMaxEncodedLength = 10 + 10
    , kFooterEncodedLength         = 2 * kBlockHandleMaxEncodedLength + 8
    , kTableMagicNumber            = new Int64('db4775248b80fb57')
    , kBlockTrailerSize            = 5
    , kNoCompression               = 0x0
    , kSnappyCompression           = 0x1


var readBlock = function (fd, handle, callback) {
      var buffer = new Buffer(handle.size + kBlockTrailerSize)

      fs.read(fd, buffer, 0, buffer.length, handle.offset, function (err, len) {
        if (err)
          return callback(err)

        if (len != buffer.length)
          return callback(new Error('corrupt table, truncated block read'))

        if (buffer[handle.size] === kSnappyCompression)
          return callback(new Error('Snappy compression not yet supported'))
        if (buffer[handle.size] !== kNoCompression)
          return callback(new Error('corrupt table, unknown compression type'))

        callback(null, new Block(buffer.slice(0, handle.size)))
      })
    }

  , readTableFile = function (fd) {
      var ee = new EventEmitter()

      fs.fstat(fd, function (err, stats) {
        var footer = new Buffer(kFooterEncodedLength)
        fs.read(fd, footer, 0, kFooterEncodedLength, stats.size - kFooterEncodedLength, function (err, len) {
          if (err)
            return ee.emit('error', err)

          if (len != kFooterEncodedLength)
            return ee.emit('error', new Error('problem reading table file footer')) // eh?

          var magic = coding.readFullInt64(footer, kFooterEncodedLength - 8)
          if (magic.toOctetString() != kTableMagicNumber.toOctetString())
            ee.emit('error', new Error('corrupt table file, bad magic number'))

          var pos = 0
            , metaIndex
            , index
            , tmp = coding.readBlockHandle(footer, pos)

          metaIndex = tmp[0]
          tmp = coding.readBlockHandle(footer, pos += tmp[1])
          index = tmp[0]

          readBlock(fd, metaIndex, function (err, data) {
            if (err)
              return ee.emit('error', err)

            console.log('meta:', metaIndex, 'data', data)
          })

          readBlock(fd, index, function (err, data) {
            if (err)
              return ee.emit('error', err)

            console.log('index:', index, 'data', data)

            processIndex(fd, data, function (err) {
              if (err)
                ee.emit('error')
              ee.emit('done')
            })
          })
        })
      })

      return ee
    }

  , processIndex = function (fd, index, callback) {
      var dataIteratorFn = function (handle, callback) {
            readBlock(fd, handle, function (err, block) {
              if (err)
                return callback(err)

              callback(null, block.iterator())
            })
          }
        , iit = new IndexedIterator(index.iterator(), dataIteratorFn)
        , loop = function (callback) {
            iit.next(function (err, ok) {
              if (err)
                return callback(err)

              if (!iit.valid())
                return callback()

              console.log('key =', iit.key.toString())//, 'value =', iit.value.toString())
              process.nextTick(loop.bind(null, callback))
            })
          }

      iit.seekToFirst(function (err) {
        if (err)
          return callback(err)

        loop(callback)
      })

/*
        var baseLg = it.key[it.key.length - 1]
        var lastWord = it.key.readUInt32LE(it.key.length - 5)
        console.log(
            'it.key', it.key.slice(0, it.key.length - 6).toString()
          , 'blg', baseLg
          , 'lw', lastWord
          , 'kl', it.key.length
          , 'kllw', it.key.length - lastWord, lastWord > it.key.length - 5
          , 'it.value', it.value.toString(), coding.readBlockHandle(it.value, 0)
        )
        // it.key may match
        if (lastWord <= it.key.length - 5) {
          //var start = it.key.readUInt32LE()
          var num = (it.key.length - 5 - lastWord) / 4
          var start = it.key.readUInt32LE(lastWord)
          var limit = it.key.readUInt32LE(lastWord + 4)
          console.log('num', num, 'start', start, 'limit', limit)
        }
*/
    }

module.exports = readTableFile