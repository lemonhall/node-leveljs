#!/usr/bin/env node

const fs        = require('fs')
    , logReader = require('./log-reader')

if (/\d+\.log$/.test(process.argv[2])) {
  var fd = fs.openSync(process.argv[2], 'r')
  logReader(fd)
    .on('error', function (err) {
      console.error('An error occurred reading the log file: ', err)
      console.error(err.stack)
      process.exit(-1)
    })
    .on('entry', function (entry) {
      console.log('Read', entry.type, 'entry:')
      console.log('\tKey   :', entry.key.toString('utf8'))
      if (entry.type == 'put')
        console.log('\tValue :', entry.value.toString('utf8').substring(0, 25) + (entry.value.length > 25 ? '...' : ''))
    })
    .on('done', function () {
      console.log('Done!')
      fs.closeSync(fd)
    })
} else {
  console.error('Usage: leveljs <LevelDB log file>')
  process.exit(-1)
}