'use strict'
const BN = require('bn.js');
const Staker = artifacts.require('StakerMock')
const DSAuth = artifacts.require('DSAuth')
const DSToken = artifacts.require("DSToken")
const DSGuard = artifacts.require("DSGuard")
const Compound = artifacts.require("FakeCompound")
const Touch = artifacts.require("TOUCH")


contract('test', function(accounts) {
    const owner = accounts[0]
    const user1 = accounts[1]

    let tx
    let compound, staker
    let dsGuard
    let usdt, touch

    const d18 = function (amount) {
        amount = new BN(amount)
        return web3.utils.toWei(amount, "ether")
    }

    const d6 = function (amount) {
        amount = new BN(amount)
        return web3.utils.toWei(amount, "mwei")
    }

    const f18 = function (amount) {
        amount = new BN(amount)
        return web3.utils.fromWei(amount, "ether")
    }

    const f6 = function (amount) {
        amount = new BN(amount)
        return web3.utils.fromWei(amount, "mwei")
    }

    const d8 = function (amount) {
        return amount * 100000000
    }

    const f8 = function (amount) {
        return amount / 100000000
    }

    it("go through", async function () {
        usdt = await DSToken.new("0x444600000000000000000000000000", 6)
        touch = await Touch.new(1000000000)
        compound = await Compound.new(usdt.address)
        staker = await Staker.new(touch.address, usdt.address, compound.address)
        dsGuard = await DSGuard.new()
        tx = await staker.setAuthority(dsGuard.address)
        tx = await dsGuard.permitANY(staker.address, "0x8dbdbe6d")
        tx = await touch.transfer(staker.address, d8(922223))

        tx = await usdt.mint(user1, d6(1000))
        tx = await usdt.approvex(staker.address, {from: user1})

        // should scuess
        tx = await staker.setTouchPrice(12500)
        tx = await staker.deposit(d6(500), 1, user1, {from: user1})

        // should fail if deposit is forbid
        tx = await dsGuard.forbidANY(staker.address, "0x8dbdbe6d")
        try {
            await await staker.deposit(d6(500), 1, user1, {from: user1})
            assert.fail('Expected revert not received');
        } catch (error) {
            const revertFound = error.message.search('revert') >= 0;
            assert(revertFound, `Expected "revert", got ${error} instead`)
        }
    });
});
