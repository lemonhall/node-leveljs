const DEBUG               = false

    , kBlockSize          = 32768
    , kHeaderSize         = 4 + 1 + 2

    , kBatchHeaderSize    = 12

    , kRecordTagDeletion  = 0
    , kRecordTagValue     = 1

const fs           = require('fs')
    , EventEmitter = require('events').EventEmitter
    , coding       = require('./coding')

    , RecordType              = {
          EOF           : -2
        , Bad           : -1
        , Full          : 1
        , FragmentStart : 2
        , FragmentMid   : 3
        , FragmentEnd   : 4
        , valid         : function (t) {
            return t >= 0 && t <= 4
          }
      }

var Reader = (function () {
      function Reader (fd) {
        this._fd             = fd
        this._eof            = false
        this._length         = 0
        this._position       = 0
        this._reads          = 0
        this._fragments      = []
        this._fragmentLength = 0
      }

      Reader.prototype.read = function(callback) {
        this._buffer = new Buffer(kBlockSize)

        fs.read(this._fd, this._buffer, 0, kBlockSize, this._reads * kBlockSize, function (err, length) {
          this._reads++
          this._position = 0
          this._length = length

          if (err)
            return callback(err)

          if (length < kBlockSize)
            this._eof = true

          callback()
        }.bind(this))
      }

      Reader.prototype.length = function() {
        return this._length - this._position
      }

      Reader.prototype.reset = function() {
        this._length = 0
        this._position = 0
        this._eof = false
      }

      Reader.prototype.isEof = function() {
        return this._eof === false ? false : this.length() === 0
      }

      Reader.prototype.skip = function(len) {
        this._position += len
      }

      Reader.prototype.readUInt32 = function(offset, fragment) {
        return fragment ?
          this._combinedFragment.readUInt32LE(offset) :
          this._buffer.readUInt32LE(this._position + offset)
      }

      Reader.prototype.readUInt8 = function(offset, fragment) {
        return fragment ?
          this._combinedFragment.readUInt8(offset) :
          this._buffer.readUInt8(this._position + offset)
      }

      Reader.prototype.readLengthPrefixedSlice = function(offset, fragment) {
        return fragment ?
          coding.readLengthPrefixedSlice(this._combinedFragment, offset) :
          coding.readLengthPrefixedSlice(this._buffer, this._position + offset)
      }

      Reader.prototype.fragmentLength = function() {
        return this._fragmentLength
      }

      Reader.prototype.appendFragment = function(len) {
        var buffer = this._buffer.slice(this._position, this._position + len)
        this.skip(len)
        this._fragments.push(buffer)
        this._fragmentLength += buffer.length
      }

      Reader.prototype.combineFragment = function() {
        this._combinedFragment = Buffer.concat(this._fragments, this._fragmentLength)
      }

      Reader.prototype.discardFragment = function() {
        this._combinedFragment = null
        this._fragments = []
        this._fragmentLength = 0
      }

      return Reader
    }())

var readRecord = function (reader, callback) {
      if (reader.length() < kHeaderSize) {
        if (!reader.isEof()) {
          return reader.read(function (err) {
            if (err)
              return callback(err)
            readRecord(reader, callback)
          })
        } else if (reader.length() === 0) {
          return callback(null, RecordType.EOF)
        } else {
          return callback(new Error('corrupt log, truncated record at end of file'))
        }
      }

      var a      = reader.readUInt32(4) & 0xff
        , b      = reader.readUInt32(5) & 0xff
        , type   = reader.readUInt8(6)
        , length = a | (b << 8)
      
      if (kHeaderSize + length > reader.length())
        return callback(new Error('corrupt log, bad record length'))

      if (!RecordType.valid(type))
        return callback(new Error('corrupt log, invalid record type (' + type + ')'))

      if (type === 0 && length === 0) { // zero length, zero type
        reader.reset()
        return callback(null, RecordType.Bad)
      }

      // TODO: crc checksum

      reader.skip(kHeaderSize)

      // TODO: initial offset not supported

      callback(null, type, length)
    }

  , processBatch = function (ee, reader, recordLength, callback) {
      var recordPos = kBatchHeaderSize
        , fragment = recordLength === false
        , found = 0
        , batchSize
        , recordTag
        , keySlice
        , valueSlice
        , tmp

      if (fragment) {
        reader.combineFragment()
        recordLength = reader.fragmentLength()
      }

      batchSize = reader.readUInt32(8, fragment)

      while (recordPos < recordLength) {
        recordTag = reader.readUInt8(recordPos++, fragment)

        switch (recordTag) {

          case kRecordTagValue:
            tmp = reader.readLengthPrefixedSlice(recordPos, fragment)
            keySlice = tmp[0]
            recordPos += tmp[1]
            tmp = reader.readLengthPrefixedSlice(recordPos, fragment)
            valueSlice = tmp[0]
            recordPos += tmp[1]
            ee.emit('entry', { type: 'put', key: keySlice, value: valueSlice })
            break;

          case kRecordTagDeletion:
            tmp = reader.readLengthPrefixedSlice(recordPos, fragment)
            keySlice = tmp[0]
            recordPos += tmp[1]
            ee.emit('entry', { type: 'del', key: keySlice })
            break;

          default:
            return ee.emit('error', new Error('corrupt log record, unknown tag: ' + recordTag))

        }

        found++
      }

      if (found != batchSize) {
        return ee.emit(
            'error'
          , new Error('corrupt log, did not find correct number of entries for batch, expected ' + batchSize + ', found ' + found)
        )
      }

      if (fragment)
        reader.discardFragment()
      else
        reader.skip(recordLength)
      callback()
    }

  , readLogFile = function (fd) {
      var reader  = new Reader(fd)
        , ee      = new EventEmitter()

        , handler = function (err, type, recordLength) {
            if (err)
              return ee.emit('error', err)

            switch (type) {
              case RecordType.Full:
                DEBUG && console.log('RecordType.Full')
                processBatch(ee, reader, recordLength, loop)
                break

              case RecordType.Bad:
                DEBUG && console.log('RecordType.Bad')
                if (reader.fragmentLength())
                  return ee.emit('error', new Error('corrupt log, bad record in the middle of a partial'))
                // this is ok unless we're in a fragmented record
                loop()
                break

              case RecordType.FragmentStart:
                DEBUG && console.log('RecordType.FragmentStart')
                if (reader.fragmentLength())
                  return ee.emit('error', new Error('corrupt log, partial record without end'))
                reader.appendFragment(recordLength)
                loop()
                break

              case RecordType.FragmentMid:
                DEBUG && console.log('RecordType.FragmentMid')
                if (!reader.fragmentLength())
                  return ee.emit('error', new Error('corrupt log, partial record without start'))
                reader.appendFragment(recordLength)
                loop()
                break

              case RecordType.FragmentEnd:
                DEBUG && console.log('RecordType.FragmentEnd')
                if (!reader.fragmentLength())
                  return ee.emit('error', new Error('corrupt log, partial record without start'))
                reader.appendFragment(recordLength)
                processBatch(ee, reader, false, loop)
                break

              case RecordType.EOF:
                DEBUG && console.log('RecordType.EOF')
                return ee.emit('done')

              default:
                return ee.emit('error', new Error('corrupt log, unknown record type (' + type + ')'))
            }
          }

        , loop = function () {
            process.nextTick(readRecord.bind(null, reader, handler))
          }

      loop()

      return ee
    }

module.exports = readLogFile