'use strict'
const BN = require('bn.js');
const Staker = artifacts.require('StakerMock')
const DSAuth = artifacts.require('DSAuth')
const TouchEvent = artifacts.require('TouchEvent')
const DSToken = artifacts.require("DSToken")
const DSGuard = artifacts.require("DSGuard")
const LendFMe = artifacts.require("FakeLendFMe")
const EventContract = artifacts.require("TouchEvent")


contract('test', function(accounts) {
    const owner = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]

    let tx, currentTime
    let lendFMe, staker, eventContract 
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

    const showBalance = async function (note, address) {
        tx = await lendFMe.makeProfitToUser(staker.address, usdt.address, 1)
        console.log("-------------------------------------------")
        console.log("** " + note)
        if(address == user1) {
            console.log("user1")
        } else if (address == user2) {
            console.log("user2")
        } else if (address == user3) {
            console.log("user3")
        } else {
            console.log(address)
        }
        console.log("\tusdt balance:", f6(await usdt.balanceOf(address)))
        console.log("\ttouch balance:", f6(await touch.balanceOf(address)))
        console.log("staker")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(staker.address)))
        console.log("\ttouch balance:", f6(await touch.balanceOf(staker.address)))
        console.log("\tstaker's total usdt balance (including in Defi):", f6(await staker.tokenBalance(usdt.address)))
        console.log("\tstaker's profit: ", f6(await staker.getProfit(usdt.address)))
    }

    const showEventStatus = async function (note) {
        console.log("-------------------------------------------")
        console.log("** " + note)
        let _eventId = await eventContract.eventCounts()
        let _event = await eventContract.events(_eventId)
        console.log("current event id: ", _eventId.toString())
        console.log("is liked eneded? ", (await eventContract.isLikeEnded()))
        console.log("is bid ended? ", (await eventContract.isBidEnded()))
        console.log("current event's options: ", _event.options.toString())
        console.log("current event's total liked: ", f6(_event.totalLiked))
        if(_event.options.toNumber() > 1) {
            console.log("option info: ")
        }
        let _option
        for (let i = 0; i < _event.options.toNumber(); i++) {
            _option = await eventContract.options(_eventId, i)
            console.log("\t option id: ", i)
            console.log("\t option likes: ", f6(_option.likes))
            console.log("\t option first bid: ", f6(_option.firstBid))
            console.log("\t option first bidder: ", _option.firstBidder)
        }
        await showUserTouchBalance()
    }

    const showUserTouchBalance = async function () {
        console.log("touch balance")
        console.log("\tuser1: ", f6(await touch.balanceOf(user1)))
        console.log("\tuser2: ", f6(await touch.balanceOf(user2)))
        console.log("\tuser3: ", f6(await touch.balanceOf(user3)))
    }

    const renewEventContract = async function () {
        eventContract = await EventContract.new(touch.address);
        tx = await touch.approvex(eventContract.address, {from: user1})
        tx = await touch.approvex(eventContract.address, {from: user2})
        tx = await touch.approvex(eventContract.address, {from: user3})
    }

    it("go through", async function () {
        usdt = await DSToken.new("0x444600000000000000000000000000", 6)
        touch = await DSToken.new("0x444600000000000000000000000000", 6)
        lendFMe = await LendFMe.new()
        staker = await Staker.new()
        tx = staker.active(touch.address, usdt.address, lendFMe.address)

        tx = await usdt.mint(user1, d6(1000))
        tx = await usdt.mint(user2, d6(1000))
        tx = await usdt.mint(user3, d6(1000))
        tx = await touch.mint(staker.address, d6(10000))

        tx = await usdt.approvex(staker.address, {from: user1})
        tx = await usdt.approvex(staker.address, {from: user2})
        tx = await usdt.approvex(staker.address, {from: user3})

        console.log("-------------------------------------------")
        console.log("** init")
        console.log("user1")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user1)))
        console.log("\ttouch balance:", f6(await touch.balanceOf(user1)))
        console.log("user2")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user2)))
        console.log("\ttouch balance:", f6(await touch.balanceOf(user2)))
        console.log("user3")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user3)))
        console.log("\ttouch balance:", f6(await touch.balanceOf(user3)))
        console.log("staker")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(staker.address)))
        console.log("\ttouch balance:", f6(await touch.balanceOf(staker.address))) 
        console.log("\tstaker's total usdt balance (including in Defi):", f6(await staker.tokenBalance(usdt.address)))

        tx = await staker.deposit(d6(500), 1, {from: user1})
        await showBalance("user1 deposit 500 for 1 month", user1)

        tx = await staker.deposit(d6(500), 2, {from: user2})
        await showBalance("user2 deposit 500 for 2 month", user2)

        tx = await staker.deposit(d6(500), 3, {from: user3})
        await showBalance("user3 deposit 500 for 3 month", user3)

        // set time to one month
        currentTime = await staker.getTime();
        tx = await staker.setTime(currentTime + 1000 * 60 * 60 * 24 * 30 + 1);

        // user1 withdraw
        tx = await staker.withdraw(1, {from: user1})
        await showBalance("user1 withdraw withdraw id 1", user1)

        // user2 withdraw
        tx = await staker.withdraw(1, {from: user2})
        await showBalance("user2 withdraw id 1", user2)

        await renewEventContract()
        await showEventStatus("event contract init")

        // start a new event with 2 options
        tx = await eventContract.startNewEvent(2)
        await showEventStatus("start a new event with 2 options")

        // user1 like option1
        tx = await eventContract.userLikeGirl(0, d6(1), {from: user1})
        await showEventStatus("user1 like option 0 ")

        // user2 bid option 1
        tx = await eventContract.userBidGirl(1, d6(1), {from: user2})
        await showEventStatus("user2 bid option 1")

        // user3 bid option 1
        tx = await eventContract.userBidGirl(1, d6(2), {from: user3})
        await showEventStatus("user3 bid option 1")

        // end like
        tx = await eventContract.setLikeEnded()
        await showEventStatus("like ended")

        // end bid
        tx = await eventContract.setBidEnded()
        await showEventStatus("bid ended")

        // start a new event with 3 optons
        tx = await eventContract.startNewEvent(3)
        await showEventStatus("start a new event with 3 options")

    });
});
