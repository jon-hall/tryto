'use strict';

const tryto = require('../src/tryto');

describe('tryto', function() {
    describe('when we try to run a function', function() {
        describe('and we don\'t supply a function', function() {
            it('it rejects', function(done) {
                tryto()
                    .for(1)
                    .every(100)
                    .now()
                    .then(_ => {
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
                            .then(_ => {
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
                        var i = 0;
                        tryto(function() {
                            if(++i < 100) throw 'fail';
                        })  .for(100)
                            .now()
                            .then(_ => {
                                expect(i).toBe(100);
                                done();
                            }, err => {
                                expect(err).toBe('no error');
                                done();
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
                        var i = 0,
                            // To test extreme iterations (100,000,000), set STRESS_TEST
                            // WARNING: It'll probably take several minutes to run!
                            limit = process.env.STRESS_TEST ? 100000000 : 100000;

                        tryto(function() {
                            if(i < limit) throw 'fail';
                        })  .every(1)
                            .now()
                            .then(_ => {
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
                        var i = 0,
                            limit = 100;

                        tryto(function() { i++; throw 'fail'; })
                            .every(1)
                            .for(100)
                            .now()
                            .then(_ => {
                                expect('this').toBe('not hit');
                                done();
                            }, err => {
                                expect(i).toBe(100);
                                done();
                            });

                        while(limit--) {
                            jasmine.clock().tick(1);
                        }
                    });

                    describe('and we\'re using the (default) nobackoff strategy', function() {
                        it('it repeats at regular intervals', function(done) {
                            var i = 0,
                                limit = 99,
                                d;

                            tryto(function() { i++; throw 'fail'; })
                                .every(1)
                                .for(100)
                                .now()
                                .then(_ => {
                                    expect('this').toBe('not hit');
                                    done();
                                }, err => {
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
                            var i = 0,
                                limit = 99,
                                n = 1,
                                d;

                            tryto(function() { i++; throw 'fail'; })
                                .using(tryto.linear)
                                .config({ step: 1, max: 999999 })
                                .every(1)
                                .for(100)
                                .now()
                                .then(_ => {
                                    expect('this').toBe('not hit');
                                    done();
                                }, err => {
                                    expect(i).toBe(100);
                                    done();
                                });

                            while(limit--) {
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
                });
            });
        });
    });
});
