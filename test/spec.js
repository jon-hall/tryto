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
                describe('and we don\'t supply a "for" value', function() {
                    it('it runs the task indefinitely', function(done) {
                        var i = 0;
                        tryto(function() {
                            if(++i < 100) throw 'fail';
                        })  .every(10)
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
        });
    });
});
