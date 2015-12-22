'use strict';
const simple_backoff = require('simple-backoff'),
    _ = require('lodash.merge');

class Tryto {
    constructor(fn) {
        this._fn = fn;
        this._for = Infinity;
        this._using = simple_backoff.LinearBackoff;
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
            strat = this._getStrat();
        }

        return new Promise((res, rej) => {
            if(typeof this._fn !== 'function') {
                return rej('ERR: Function must be supplied to constructor.');
            }

            if(this._for === Infinity && !this._every) {
                return rej('ERR: For or every must be called before starting.');
            }

            setTimeout(() => {
                try {
                    let result = this._fn();

                    if(result instanceof Promise) {
                        result.then(null, () => {
                            if(--this._for) {
                                return this.in(this._getDelay(strat), strat);
                            } else {
                                throw 'expired';
                            }
                        }).then(res, rej);
                    } else {
                        res();
                    }
                } catch(ex) {
                    if(--this._for) {
                        this.in(this._getDelay(strat), strat).then(res, rej);
                    } else {
                        rej('expired');
                    }
                }
            }, delay);
        });
    }

    _getStrat() {
        if([
            simple_backoff.LinearBackoff,
            simple_backoff.ExponentialBackoff,
            simple_backoff.FibonacciBackoff
        ].indexOf(this._using) >= 0) {
            let cfg = _({},
                this._config, {
                    min: this._every || 0,
                    step: this._every || 0,
                    factor: 2
                });
            return new this._using(this._config);
        }
    }

    _getDelay(strat) {
        return strat.next();
    }
}

exports = module.exports = function tryto(fn) {
    return new Tryto(fn);
};

exports.linear = simple_backoff.LinearBackoff;
exports.exponential = simple_backoff.ExponentialBackoff;
exports.fibonacci = simple_backoff.FibonacciBackoff;
