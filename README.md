# LevelJS

A pure JavaScript implementation of LevelDB.

**A very immature work-in-progress with currently not much practical use.**

## API

### leveljs.logReader(fd)
Given a file descriptor (obtained via `fs.open()`), parse a LevelDB format *.log* file. Emits data & errors via an EventEmitter.

**Events:**

 * `'entry'`: similar to the `batch()` entries in [LevelUP](https://github.com/rvagg/node-levelup). You will either get entries of the form: `{ type: 'put', key: 'key', value: 'value' }` or `{ type: 'del', key: 'key' }`.
 * `'done'`: when parsing is complete
 * `'error'`: whenever there is some kind of parsing or I/O error; parsing will be halted.

## Licence

LevelJS is Copyright (c) 2013 Rod Vagg [@rvagg](https://twitter.com/rvagg) and licenced under the MIT licence. All rights not explicitly granted in the MIT license are reserved. See the included LICENSE file for more details.