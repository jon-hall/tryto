# try-to

Try to do a task, try again if it fails, backing-off with a customisable algorithm, and returning a promise (built on top of the excellent [simple-backoff](https://github.com/myndzi/simple-backoff).

```sh
npm install try-to --save
```

### Usage
A simple example, illustrating all of the main API features.
```js
'use strict';
const tryto = require('try-to');

tryto(function() {
    // Do stuff, throw on failure, or return result...
    // Can return a promise, which will be waited on
})  .every(100)                 // start retrying at 100ms intervals
    .for(20)                    // max 20 retries
    .using(tryto.exponential)   // exponential back-off
    .config({ max: 1e6 })       // cap it to 1,000s retries
    .now()                      // start trying immediately
    .then(result => {
        // Function got ran!
    }, err => {
        // Function didn't successfully run
    });
```

### API Docs
For complete API docs see [API.md](API.md).
