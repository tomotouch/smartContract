'use strict'
const BN = require('bn.js');
const Staker = artifacts.require('StakerMock')
const DSAuth = artifacts.require('DSAuth')
const TouchEvent = artifacts.require('TouchEvent')
const DSToken = artifacts.require("DSToken")
const DSGuard = artifacts.require("DSGuard")
//const LendFMe = artifacts.require("FakeLendFMe")
const Compound = artifacts.require("FakeCompound")
const EventContract = artifacts.require("TouchEvent")
const Touch = artifacts.require("TOUCH")


contract('test', function(accounts) {
    const owner = accounts[0]
    const user1 = accounts[1]
    const user2 = accounts[2]
    const user3 = accounts[3]
    const user4 = accounts[4]
    const user5 = accounts[5]
    const user6 = accounts[6]
    const user7 = accounts[7]
    const user8 = accounts[8]
    const user9 = accounts[9]
    const user10 = accounts[10]
    const user11 = accounts[11]
    const user12 = accounts[12]
    const user13 = accounts[13]
    const user14 = accounts[14]
    const bidProfitBeneficiary = accounts[15]
    const winner = accounts[16]

    let tx, currentTime
    let compound, staker, eventContract 
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

    const showBalance = async function (note, address) {
        //tx = await lendFMe.makeProfitToUser(staker.address, usdt.address, 1)
        console.log("-------------------------------------------")
        console.log("** " + note)
        console.log("\t current touch price:", f6(await staker.getTouchPrice()))
        if(address == user1) {
            console.log("user1")
        } else if (address == user2) {
            console.log("user2")
        } else if (address == user3) {
            console.log("user3")
        } else if (address == user4) {
            console.log("user4")
        } else if (address == user5) {
            console.log("user5") 
        } else if (address == user6) {
            console.log("user6")
        } else if (address == user7) {
            console.log("user7")
        } else if (address == user8) {
            console.log("user8")
        } else if (address == user9) {
            console.log("user9")
        } else if (address == user10) {
            console.log("user10") 
        } else if (address == user11) {
            console.log("user11")
        } else if (address == user12) {
            console.log("user12")
        } else if (address == user13) {
            console.log("user13") 
        } else if (address == user14) {
            console.log("user14")
        }else {
            console.log(address)
        }
        console.log("\tusdt balance:", f6(await usdt.balanceOf(address)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(address)))
        console.log("staker")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(staker.address)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(staker.address)))
        console.log("\tstaker's total usdt balance (including in Defi):", f6(await staker.tokenBalance()))
        console.log("\tstaker's profit: ", f6(await staker.getProfit()))
    }

    const showReferalInfo = async function (note, address) {
        let _account = await staker.accounts(address)
        console.log("** " + note)
        console.log("referredCount: ", _account.referredCount.toString())
        console.log("referredAmount: ", f6(_account.referredAmount).toString())
        console.log("referredMilestoneAchived: ", f6(_account.referredMilestoneAchived).toString())
        console.log("rewards: ", f8(_account.rewards).toString())
        console.log("is referalName paid: ", _account.isReferalNamePaid)
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
        console.log("current event's total liked: ", f8(_event.totalLiked))
        console.log("top bidder: ", (await _event.firstBidder))
        console.log("bid: ", f8(_event.firstBid).toString())
        console.log("current option: ", _event.currentOption.toString())
        if(_event.options.toNumber() > 1) {
            console.log("option info: ")
        }
        let _option, likers
        for (let i = 0; i < _event.options.toNumber(); i++) {
            _option = await eventContract.options(_eventId, i)
            console.log("\t option id: ", i)
            console.log("\t option likes: ", f8(_option.likes))
            console.log("\t unique liker: ", _option.uniqueLike.toString())
            likers = await eventContract.getOptionLiker(_eventId, i, 0, _option.uniqueLike.toNumber())
            console.log("\t option likers: ", (await eventContract.getOptionLiker(_eventId, i, 0, _option.uniqueLike.toNumber())))
        }
        await showUserTouchBalance()
    }

    const showUserTouchBalance = async function () {
        console.log("touch balance")
        console.log("\tuser1: ", f8(await touch.balanceOf(user1)))
        console.log("\tuser2: ", f8(await touch.balanceOf(user2)))
        console.log("\tuser3: ", f8(await touch.balanceOf(user3)))
        console.log("\tevent contract: ", f8(await touch.balanceOf(eventContract.address)))
        console.log("\tplatform profit: ", f8(await touch.balanceOf(bidProfitBeneficiary)))
    }

    const renewEventContract = async function () {
        eventContract = await EventContract.new(touch.address);
        tx = await touch.approve(eventContract.address, d8(9999999), {from: user1})
        tx = await touch.approve(eventContract.address, d8(9999999), {from: user2})
        tx = await touch.approve(eventContract.address, d8(9999999), {from: user3})
        tx = await eventContract.setBidProfitBeneficiary(bidProfitBeneficiary)
    }

    it("go through", async function () {
        usdt = await DSToken.new("0x444600000000000000000000000000", 6)
        touch = await Touch.new(1000000000)
        compound = await Compound.new(usdt.address)
        staker = await Staker.new()
        tx = staker.activate(touch.address, usdt.address, compound.address)

        tx = await usdt.mint(user1, d6(1000))
        tx = await usdt.mint(user2, d6(1000))
        tx = await touch.transfer(staker.address, d8(922223))

        tx = await usdt.approvex(staker.address, {from: user1})
        tx = await usdt.approvex(staker.address, {from: user2})

        console.log("-------------------------------------------")
        console.log("** init")
        console.log("user1")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user1)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user1)))
        console.log("user2")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user2)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user2)))
        console.log("staker")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(staker.address)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(staker.address))) 
        console.log("\tstaker's total usdt balance (including in Defi):", f6(await staker.tokenBalance()))

        tx = await staker.setTouchPrice(12500)
        tx = await staker.deposit(d6(500), 1, user1, {from: user1})
        await showBalance("user1 deposit 500 for 1 month", user1)

        tx = await staker.deposit(d6(500), 2, user2, {from: user2})
        await showBalance("user2 deposit 500 for 2 month", user2)

        // set time to one month
        tx = await staker.forward10days()
        tx = await staker.forward10days()
        tx = await staker.forward10days()

        // user1 withdraw
        tx = await staker.withdraw(user1, 1, {from: user1})
        await showBalance("user1 withdraw withdraw id 1", user1)

        tx = await staker.forward10days()
        tx = await staker.forward10days()

        // user2 withdraw
        tx = await staker.withdraw(user2, 1, {from: user2})
        await showBalance("user2 withdraw id 1", user2)

    });
});
