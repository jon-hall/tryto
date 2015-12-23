'use strict';
const simple_backoff = require('simple-backoff'),
    _ = require('lodash.merge');

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
        let strat = arguments[1];

        if(!strat) {
            strat = this._get_strat();
        }

        return new Promise((res, rej) => {
            if(typeof this._fn !== 'function') {
                return rej('ERR: Function must be supplied to constructor.');
            }

            if(this._for === Infinity && !this._every) {
                return rej('ERR: For or every must be called before starting.');
            }

            let _this = this;
            setTimeout(function try_again() {
                try {
                    let result = _this._fn();

                    if(result instanceof Promise) {
                        result.then(res, () => {
                            if(--_this._for) {
                                setTimeout(try_again, strat());
                            } else {
                                throw 'expired';
                            }
                        }).then(null, rej);
                    } else {
                        res();
                    }
                } catch(ex) {
                    if(--_this._for) {
                        setTimeout(try_again, strat());
                    } else {
                        rej('expired');
                    }
                }
            }, delay);
        });
    }

    _get_strat() {
        if([
            exports.nobackoff,
            exports.linear,
            exports.exponential,
            exports.fibonacci
        ].indexOf(this._using) >= 0) {
            let cfg = _({},
                this._config, {
                    min: this._every || 0,
                    step: this._every || 0,
                    factor: 2
                });
            return this._using(cfg);
        }
    }
}
