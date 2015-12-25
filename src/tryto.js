'use strict';
const simple_backoff = require('simple-backoff'),
    _ = require('lodash.merge'),
    STRATEGY_CHECKED = Symbol();

exports = module.exports = function tryto(fn) {
    return new Tryto(fn);
};

function nextify(Ctor) {
    return function(cfg) {
        let nexter = new Ctor(cfg);
        return function next() {
            return nexter.next();
        };
    };
}

function NoBackoff(cfg) {
    simple_backoff.Backoff.call(this, cfg);
}
NoBackoff.prototype = Object.create(simple_backoff.Backoff.prototype);
NoBackoff.prototype._step = NoBackoff.prototype._reset = function(){ this.cur = this.min; };

exports.nobackoff = nextify(NoBackoff);
exports.linear = nextify(simple_backoff.LinearBackoff);
exports.exponential = nextify(simple_backoff.ExponentialBackoff);
exports.fibonacci = nextify(simple_backoff.FibonacciBackoff);

class Tryto {
    constructor(fn) {
        this._fn = fn;
        this._for = Infinity;
        this._using = exports.nobackoff;
    }

    for(times) {
        this._for = times;
        return this;
    }

    every(delay) {
        this._every = delay;
        return this;
    }

    using(strategy) {
        this._using = strategy;
        return this;
    }

    config(config) {
        this._config = config;
        return this;
    }

    now() {
        // start
        return this.in();
    }

    in(delay) {
        let strategy = arguments[1];

        if(!strategy) {
            strategy = this.strategy;
        }

        return new Promise((res, rej) => {
            if(typeof this._fn !== 'function') {
                return rej('ERR: Function must be supplied to constructor.');
            }

            if(this._for === Infinity && !this._every) {
                return rej('ERR: For or every must be called before starting.');
            }

            let retrier = this._get_retrier(strategy, res, rej);
            setTimeout(retrier, delay);
        });
    }

    get strategy() {
        if(this._using.length === 1) {
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

    _get_retrier(strategy, res, rej) {
        let last_delay = this._every || 0,
            retries = 0,

            internal_retry = () => {
                let result = this._fn();

                if(result instanceof Promise) {
                    result.then(res, () => {
                        if(--this._for) {
                            setTimeout(try_again, (last_delay = this._get_delay(strategy, { last_delay, retries })));
                        } else {
                            throw 'expired';
                        }
                    }).then(null, rej);
                } else {
                    res();
                }
            },

            try_again = () => {
                retries++;
                try {
                    internal_retry();
                } catch(ex) {
                    if(--this._for) {
                        try {
                            // _get_delay can throw if we're mis-configured, so make sure we catch and reject
                            setTimeout(try_again, (last_delay = this._get_delay(strategy, { last_delay, retries })));
                        } catch(ex2) {
                            rej(ex2);
                        }
                    } else {
                        rej('expired');
                    }
                }
            };

        return try_again;
    }

    _get_delay(strategy, context) {
        if(strategy[STRATEGY_CHECKED]) {
            return strategy.call(context);
        }

        let n;
        try {
            n = strategy.call(context);
            if((typeof n !== 'number') || isNaN(n)) {
                throw 'NaN';
            }

            strategy[STRATEGY_CHECKED] = true;
        } catch(ex) {
            throw 'Strategy must be a "nextable"';
        }

        return n;
    }
}
