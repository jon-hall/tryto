'use strict';
const simple_backoff = require('simple-backoff'),
    _ = require('lodash.merge'),
    STRATEGY_CHECKED = Symbol();

/**
 * The default export for the library is a factory function which wraps the Tryto constructor.
 * @module tryto
 * @param  {Function} fn The function which is to be (re)tried.
 * @return {module:tryto~Tryto}      A 'Tryto' instance which can be configured to run the supplied
 * function until it succeeds (or any configured limits are hit).
 */
exports = module.exports = function tryto(fn) {
    /*eslint-disable */
    return new Tryto(fn);
    /*eslint-enable */
};

// Wraps a 'simple-backoff' constructor in a factory method which returns a 'nextable' -
// a function which can be called to get the next delay in the sequence.
function nextify(Ctor) {
    return function(cfg) {
        let nexter = new Ctor(cfg);
        return function next() {
            return nexter.next();
        };
    };
}

// Setup the backoff strategy exports using 'nextify'
/**
 * A strategy which never increases the retry delay.
 * @type {Function}
 */
exports.nobackoff = cfg => () => cfg.step;

/**
 * A strategy which increases the retry delay linearly.
 * @type {Function}
 */
exports.linear = nextify(simple_backoff.LinearBackoff);

/**
 * A strategy which increases the retry delay exponentially.
 * @type {Function}
 */
exports.exponential = nextify(simple_backoff.ExponentialBackoff);

/**
 * A strategy which increases the retry delay based on the fibonacci sequence.
 * @type {Function}
 */
exports.fibonacci = nextify(simple_backoff.FibonacciBackoff);

 /**
 * @class
 * @classdesc The main 'tryto' class, which is created with a function to (re)try,
 * it can then be configured via a series of chainable method calls, and finally
 * started - which returns a promise.
 * @memberof module:tryto
 */
class Tryto {
    /**
     * Makes a new Tryto instance.
     * @param  {Function} fn The function this Tryto will be trying to run.
     */
    constructor(fn) {
        this._fn = fn;
        this._for = Infinity;
        this._using = exports.nobackoff;
    }

    /**
     * Specify how many times the function should be tried before rejecting.
     * @param  {Number} times The number of times to retry the function associated
     * with this Tryto before giving up.
     * @return {module:tryto~Tryto}     This instance, for chaining.
     */
    for(times) {
        this._for = times;
        return this;
    }

    /**
     * Specify how frequently the function should be tried (initially, at least).
     * @param  {Number} delay The initial delay (in milliseconds) at which to retry
     * the function, should it fail.
     * @return {module:tryto~Tryto}       This instance, for chaining.
     */
    every(delay) {
        this._every = delay;
        return this;
    }

    // TODO: Nextable -> Symbol.iterator?
    /**
     * Choose the strategy which will be used for calculating the next delay (backoff).
     * @param  {Function} strategy Either a 'nextable' - a function which can be repeatedly
     * called to get the next delay - or a 'nextable' factory, which can be called with a
     * config object and returns a 'nextable' as a result.
     * @return {module:tryto~Tryto}       This instance, for chaining.
     */
    using(strategy) {
        this._using = strategy;
        return this;
    }

    /**
     * Set any configuration for the strategy which is active when the retries are started.
     * @param  {Object} config A configuration object which will be passed to the
     * 'nextable' factory function of the active strategy when 'in' or 'now' is called.
     * @return {module:tryto~Tryto}       This instance, for chaining.
     */
    config(config) {
        this._config = config;
        return this;
    }

    /**
     * Start attempting to run the function immediately (well, on the next tick...).
     * @return {Promise}       A promise which resolves with the result of the function,
     * if it succeeds, or rejects should the function fail to execute successfully before
     * the configured limits are hit.
     */
    now() {
        // start
        return this.in();
    }

    /**
     * Start attempting to run the function after the scheduled amount of time.
     * @param  {Number} delay   The delay (in milliseconds) after which to start trying
     * the function.
     * @return {Promise}        A promise which resolves with the result of the function,
     * if it succeeds, or rejects should the function fail to execute successfully before
     * the configured limits are reached.
     */
    in(delay) {
        // Snapshot a 'nextable' from our current strategy and config
        this._nextable = this._strategy;

        return new Promise((res, rej) => {
            if(typeof this._fn !== 'function') {
                return rej('ERR: Function must be supplied to constructor.');
            }

            if(this._for === Infinity && !this._every) {
                return rej('ERR: For or every must be called before starting.');
            }

            let retrier = this._get_retrier(res, rej);
            setTimeout(retrier, delay);
        });
    }

    get _strategy() {
        if((typeof this._using === 'function') && (this._using.length === 1)) {
            // If our strategy is a function with length then it should be a 'nextable factory',
            // so invoke it (with any config setup) and get back what should be a 'nextable'
            let cfg = _({},
                this._config, {
                    min: this._every || 0,
                    step: this._every || 0,
                    factor: 2
                });
            return this._using(cfg);
        } else {
            return this._using;
        }
    }

    _get_retrier(res, rej) {
        let last_delay = this._every || 0,
            retries = 0,

            // This method handles invocation results and determining if a retry is to be
            // scheduled (done via setTimeout to unwind the call-stack and stop memory leaking)
            internal_retry = () => {
                let result = this._fn();

                if(result instanceof Promise) {
                    result.then(res, err => {
                        // TODO: How easily can allowing multiple parallel 'now'/'in' calls be done?
                        // Might just be better to store our currently active promise and return it from
                        // any calls to 'now'/'in' when we're still running...
                        if(--this._for) {
                            /*eslint-disable */
                            setTimeout(try_again, (last_delay = this._get_delay({
                                last_delay, retries
                            })));
                            /*eslint-enable */
                        } else {
                            // We failed too many times - forward the error by returning a rejection
                            return Promise.reject(err);
                        }
                    }).then(null, rej);
                } else {
                    res(result);
                }
            },

            // This method handles the actual retry execution
            try_again = () => {
                retries++;
                try {
                    internal_retry();
                } catch(ex) {
                    if(--this._for) {
                        try {
                            // _get_delay can throw if we're mis-configured, so
                            // make sure we catch and reject
                            setTimeout(try_again, (last_delay = this._get_delay({
                                last_delay, retries
                            })));
                        } catch(ex2) {
                            rej(ex2);
                        }
                    } else {
                        rej(ex);
                    }
                }
            };

        return try_again;
    }

    // Gets the next delay to retry at, also makes sure the current strategy is valid
    // and caches this information, if it is valid, so we avoid re-checking later
    _get_delay(context) {
        let nextable = this._nextable;

        if(nextable && nextable[STRATEGY_CHECKED]) {
            return nextable.call(context);
        }

        let n;
        try {
            n = nextable.call(context);
            if((typeof n !== 'number') || isNaN(n)) {
                throw 'NaN';
            }

            nextable[STRATEGY_CHECKED] = true;
        } catch(ex) {
            throw 'Strategy must be a "nextable" or "nextable factory"';
        }

        return n;
    }
}

// Export the class
exports.Tryto = Tryto;
