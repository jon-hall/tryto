'use strict';

class Tryto {
    constructor(fn) {
        this._fn = fn;
        this._for = Infinity;
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
                                return this.in(this._every);
                            } else {
                                throw 'expired';
                            }
                        }).then(res, rej);
                    } else {
                        res();
                    }
                } catch(ex) {
                    if(--this._for) {
                        this.in(this._every).then(res, rej);
                    } else {
                        rej('expired');
                    }
                }
            }, delay);
        });
    }
}

module.exports = function tryto(fn) {
    return new Tryto(fn);
};
