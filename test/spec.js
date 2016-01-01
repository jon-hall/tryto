'use strict';

const tryto = require('../src/try-to');

describe('try-to', function() {
    describe('when we try to run a function', function() {
        describe('and we don\'t supply a function', function() {
            it('it rejects', function(done) {
                tryto()
                    .for(1)
                    .every(100)
                    .now()
                    .then(() => {
                        expect('this not').toBe('hit');
                        done();
                    }, err => {
                        expect(err).toMatch(/function must be supplied/i);
                        done();
                    });
            });
        });

        describe('and we do supply a function', function() {
            describe('and we don\'t supply an "every" value', function() {
                describe('and we do\'t supply a "for" value', function() {
                    it('it rejects', function(done) {
                        tryto(function(){})
                            .now()
                            .then(() => {
                                expect('this not').toBe('hit');
                                done();
                            }, err => {
                                expect(err).toMatch(/for or every must be called/i);
                                done();
                            });
                    });
                });

                describe('and we do supply a "for" value', function() {
                    it('it runs the task for the specified number of ticks', function(done) {
                        let i = 0;
                        tryto(function() { if(++i < 100) { throw 'fail'; } })
                            .for(100)
                            .now()
                            .then(() => {
                                expect(i).toBe(100);
                                done();
                            }, err => {
                                expect(err).toBe('no error');
                                done();
                            });
                    });

                    describe('and the task never succeeds', function() {
                        it('then it rejects with the last error', function(done) {
                            let i = 0;
                            tryto(function() { throw i++; })
                                .for(100)
                                .now()
                                .then(() => {
                                    expect('this not').toBe('hit');
                                    done();
                                }, err => {
                                    expect(err).toEqual(i - 1);
                                    done();
                                });
                        });
                    });
                });
            });

            describe('and we do supply an "every" value', function() {
                beforeEach(function() {
                    jasmine.clock().install();
                });

                afterEach(function() {
                    jasmine.clock().uninstall();
                });

                describe('and we don\'t supply a "for" value', function() {
                    it('it runs the task indefinitely', function(done) {
                        let i = 0,
                            // To test extreme iterations (100,000,000), set STRESS_TEST
                            // WARNING: It'll probably take several minutes to run!
                            limit = process.env.STRESS_TEST ? 1e8 : 1e5;

                        tryto(function() { if(i < limit) { throw 'fail'; } })
                            .every(1)
                            .now()
                            .then(() => {
                                expect(i).toBe(limit + 1);
                                done();
                            }, err => {
                                expect(err).toBe('no error');
                                done();
                            });

                        while(i++ < limit) {
                            jasmine.clock().tick(1);
                        }
                    });
                });

                describe('and we do supply a "for" value', function() {
                    it('it runs the task that many times', function(done) {
                        let i = 0,
                            limit = 100;

                        tryto(function() { i++; throw 'fail'; })
                            .every(1)
                            .for(100)
                            .now()
                            .then(() => {
                                expect('this not').toBe('hit');
                                done();
                            }, () => {
                                expect(i).toBe(100);
                                done();
                            });

                        while(limit--) {
                            jasmine.clock().tick(1);
                        }
                    });

                    describe('and we\'re using the (default) nobackoff strategy', function() {
                        it('it repeats at regular intervals', function(done) {
                            let i = 0,
                                limit = 99,
                                d;

                            tryto(function() { i++; throw 'fail'; })
                                .every(1)
                                .for(100)
                                .now()
                                .then(() => {
                                    expect('this not').toBe('hit');
                                    done();
                                }, () => {
                                    expect(i).toBe(100);
                                    done();
                                });

                            while(limit--) {
                                d = i;
                                jasmine.clock().tick(1);
                                d = i - d;

                                // First tick triggers now AND retry #1
                                if(limit === 98) {
                                    expect(d).toBe(2);
                                } else {
                                    expect(d).toBe(1);
                                }
                            }
                        });
                    });

                    describe('and we\'re using the linear backoff strategy', function() {
                        it('it repeats at linearly increasing intervals', function(done) {
                            let i = 0,
                                limit = 99,
                                n = 1,
                                d;

                            tryto(function() { i++; throw 'fail'; })
                                .using(tryto.linear)
                                .config({ step: 1, max: 999999 })
                                .every(1)
                                .for(100)
                                .now()
                                .then(() => {
                                    expect('this not').toBe('hit');
                                    done();
                                }, () => {
                                    expect(i).toBe(100);
                                    done();
                                });

                            while(limit--) {
                                // Tick at increasing intervals and check how much 'i' changes by each time
                                d = i;
                                jasmine.clock().tick(n);
                                n += 1;
                                d = i - d;

                                // First tick triggers now AND retry #1 => d === 2
                                if(limit === 98) {
                                    expect(d).toBe(2);
                                } else {
                                    expect(d).toBe(1);
                                }
                            }
                        });
                    });

                    describe('and we\'re using the exponential backoff strategy', function() {
                        it('it repeats at exponentially increasing intervals', function(done) {
                            let i = 0,
                                // Need a much lower limit when exponential!
                                limit = 19,
                                n = 1,
                                d;

                            tryto(function() { i++; throw 'fail'; })
                                .using(tryto.exponential)
                                .config({ max: 1e10 })
                                .every(1)
                                .for(20)
                                .now()
                                .then(() => {
                                    expect('this not').toBe('hit');
                                    done();
                                }, () => {
                                    expect(i).toBe(20);
                                    done();
                                });

                            while(limit--) {
                                // Tick at increasing intervals and check how much 'i' changes by each time
                                d = i;
                                jasmine.clock().tick(n);
                                n *= 2;
                                d = i - d;

                                // First tick triggers now AND retry #1 => d === 2
                                if(limit === 18) {
                                    expect(d).toBe(2);
                                } else {
                                    expect(d).toBe(1);
                                }
                            }
                        });
                    });

                    describe('and we\'re using the fibonacci backoff strategy', function() {
                        it('it repeats at intervals in a fibonacci sequence', function(done) {
                            let i = 0,
                                // Need a bit of a lower limit when fibonacci
                                limit = 49,
                                n = 1,
                                c = 1,
                                t,
                                d;

                            tryto(function() { i++; throw 'fail'; })
                                .using(tryto.fibonacci)
                                .config({ max: 1e10 })
                                .every(1)
                                .for(50)
                                .now()
                                .then(() => {
                                    expect('this not').toBe('hit');
                                    done();
                                }, () => {
                                    expect(i).toBe(50);
                                    done();
                                });

                            while(limit--) {
                                // Tick at increasing intervals and check how much 'i' changes by each time
                                d = i;
                                jasmine.clock().tick(n);

                                // Get next fibonacci number
                                t = c;
                                c = n;
                                n = c + t;

                                d = i - d;

                                // First tick triggers now AND retry #1 => d === 2
                                if(limit === 48) {
                                    expect(d).toBe(2);
                                } else {
                                    expect(d).toBe(1);
                                }
                            }
                        });
                    });

                    describe('and we\'re using a custom backoff strategy', function() {
                        describe('and the strategy is null', function() {
                            it('it rejects', function(done) {
                                tryto(function(){ throw 'fail'; })
                                    .using(null)
                                    .for(2)
                                    .now()
                                    .then(() => {
                                        expect('this not').toBe('hit');
                                        done();
                                    }, err => {
                                        expect(err).toMatch(/nextable/i);
                                        done();
                                    });

                                jasmine.clock().tick(1);
                            });
                        });

                        describe('and the strategy isn\'t a function', function() {
                            it('it rejects', function(done) {
                                tryto(function(){ throw 'fail'; })
                                    .using([])
                                    .for(2)
                                    .now()
                                    .then(() => {
                                        expect('this not').toBe('hit');
                                        done();
                                    }, err => {
                                        expect(err).toMatch(/nextable/i);
                                        done();
                                    });

                                jasmine.clock().tick(1);
                            });
                        });

                        describe('and the strategy isn\'t a "nextable" and doesn\'t return one', function() {
                            it('it rejects', function(done) {
                                tryto(function(){ throw 'fail'; })
                                    .using(function(){})
                                    .for(2)
                                    .now()
                                    .then(() => {
                                        expect('this not').toBe('hit');
                                        done();
                                    }, err => {
                                        expect(err).toMatch(/nextable/i);
                                        done();
                                    });

                                jasmine.clock().tick(1);
                            });
                        });

                        describe('and the strategy is a "nextable"', function() {
                            it('it repeats at intervals returned by the strategy', function(done) {
                                let i = 0,
                                    limit = 50,
                                    n = 1,
                                    d,
                                    s;

                                tryto(function() { i++; throw 'fail'; })
                                    .using(function() {
                                        n = Math.floor(Math.random() * this.last_delay) + this.last_delay;
                                        return n;
                                    })
                                    .every(1000)
                                    .for(50)
                                    .now()
                                    .then(() => {
                                        expect('this not').toBe('hit');
                                        done();
                                    }, () => {
                                        expect(i).toBe(50);
                                        done();
                                    });

                                while(limit--) {
                                    d = i;
                                    jasmine.clock().tick(n);

                                    d = i - d;

                                    if((limit === 49) && (n === 1)) {
                                        // If the first value was 1 it'll trigger now and the first retry
                                        expect(d).toBe(2);
                                        s = true;
                                    } else if(!limit && s) {
                                        // If the first value was 1 we finished one try ago
                                        expect(d).toBe(0);
                                    } else {
                                        expect(d).toBe(1);
                                    }
                                }
                            });
                        });

                        describe('and the strategy returns a "nextable"', function() {
                            it('it repeats at intervals returned by the strategy\'s nextable', function(done) {
                                let i = 0,
                                    limit = 50,
                                    n = 1,
                                    d;

                                tryto(function() { i++; throw 'fail'; })
                                    .using(function(cfg) {
                                        return function() {
                                            n = Math.floor(Math.random() * 1000 * this.retries * cfg.v);
                                            return n;
                                        };
                                    })
                                    .config({ v: 2 })
                                    .every(1)
                                    .for(50)
                                    .now()
                                    .then(() => {
                                        expect('this not').toBe('hit');
                                        done();
                                    }, () => {
                                        expect(i).toBe(50);
                                        done();
                                    });

                                while(limit--) {
                                    d = i;
                                    jasmine.clock().tick(n);

                                    d = i - d;

                                    expect(d).toBe(1);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});
