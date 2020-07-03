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
        tx = await usdt.mint(user3, d6(1000))
        tx = await usdt.mint(user4, d6(1000))
        tx = await usdt.mint(user5, d6(1000))
        tx = await usdt.mint(user6, d6(1000))
        tx = await usdt.mint(user7, d6(5000))
        tx = await usdt.mint(user8, d6(5000))
        tx = await usdt.mint(user9, d6(5000))
        tx = await usdt.mint(user10, d6(5000))
        tx = await usdt.mint(user11, d6(5000))
        tx = await usdt.mint(user12, d6(5000))
        tx = await usdt.mint(user13, d6(5000))
        tx = await usdt.mint(user14, d6(5000))
        tx = await touch.transfer(staker.address, d8(922223))

        tx = await usdt.approvex(staker.address, {from: user1})
        tx = await usdt.approvex(staker.address, {from: user2})
        tx = await usdt.approvex(staker.address, {from: user3})
        tx = await usdt.approvex(staker.address, {from: user4})
        tx = await usdt.approvex(staker.address, {from: user5})
        tx = await usdt.approvex(staker.address, {from: user6})
        tx = await usdt.approvex(staker.address, {from: user7})
        tx = await usdt.approvex(staker.address, {from: user8})
        tx = await usdt.approvex(staker.address, {from: user9})
        tx = await usdt.approvex(staker.address, {from: user10})
        tx = await usdt.approvex(staker.address, {from: user11})
        tx = await usdt.approvex(staker.address, {from: user12})
        tx = await usdt.approvex(staker.address, {from: user13})
        tx = await usdt.approvex(staker.address, {from: user14})

        console.log("-------------------------------------------")
        console.log("** init")
        console.log("user1")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user1)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user1)))
        console.log("user2")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user2)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user2)))
        console.log("user3")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user3)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user3)))
        console.log("user4")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user4)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user4)))
        console.log("user5")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user5)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user5)))
        console.log("user6")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user6)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user6)))
        console.log("user7")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user7)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user7)))
        console.log("user8")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user8)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user8)))
        console.log("user9")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user9)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user9)))
        console.log("user10")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user10)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user10)))
        console.log("user11")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user11)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user11)))
        console.log("user12")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user12)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user12)))
        console.log("user13")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user13)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user13)))
        console.log("user14")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(user14)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(user14)))
        console.log("staker")
        console.log("\tusdt balance:", f6(await usdt.balanceOf(staker.address)))
        console.log("\ttouch balance:", f8(await touch.balanceOf(staker.address))) 
        console.log("\tstaker's total usdt balance (including in Defi):", f6(await staker.tokenBalance()))

        tx = await staker.setTouchPrice(12500)
        tx = await staker.deposit(d6(500), 1, user1, {from: user1})
        await showBalance("user1 deposit 500 for 1 month", user1)

        tx = await staker.deposit(d6(500), 2, user2, {from: user2})
        await showBalance("user2 deposit 500 for 2 month", user2)

        tx = await staker.deposit(d6(1000), 3, user2, {from: user3})
        await showBalance("user3 deposit 1000 for 3 month", user3)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.setTouchPrice(14250)
        tx = await staker.deposit(d6(500), 1, user2, {from: user4})
        await showBalance("user4 deposit 500 for 1 month", user4)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.setTouchPrice(15000)
        tx = await staker.deposit(d6(500), 1, user2, {from: user5})
        await showBalance("user5 deposit 500 for 1 month", user5)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.setTouchPrice(16500)
        tx = await staker.deposit(d6(500), 1, user2, {from: user6})
        await showBalance("user6 deposit 500 for 1 month", user6)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user7})
        await showBalance("user7 deposit 5000 for 1 month", user7)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user8})
        await showBalance("user8 deposit 5000 for 1 month", user8)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user9})
        await showBalance("user9 deposit 5000 for 1 month", user9)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user10})
        await showBalance("user10 deposit 5000 for 1 month", user10)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user11})
        await showBalance("user11 deposit 5000 for 1 month", user11)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user12})
        await showBalance("user12 deposit 5000 for 1 month", user12)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user13})
        await showBalance("user13 deposit 5000 for 1 month", user13)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        tx = await staker.deposit(d6(5000), 1, user2, {from: user14})
        await showBalance("user14 deposit 5000 for 1 month", user14)
        await showReferalInfo("user2 get referred from the last deposit", user2)

        // user2 get referral
        await showBalance("before user2 claim bonus", user2)
        tx = await staker.claimReferalReward(user2, {from: user2})
        await showBalance("after user2 claim bonus", user2)

        // set time to one month
        currentTime = await staker.getTime();
        tx = await staker.setTime(currentTime + (60 * 60 * 24 * 50 + 1));

        // user1 withdraw
        tx = await staker.withdraw(user1, 1, {from: user1})
        await showBalance("user1 withdraw withdraw id 1", user1)

        // user2 withdraw
        tx = await staker.withdraw(user2, 1, {from: user2})
        await showBalance("user2 withdraw id 1", user2)

        await renewEventContract()
        await showEventStatus("event contract init")

        // start a new event with 4 options
        tx = await eventContract.startNewEvent(4)
        await showEventStatus("start a new event with 4 options")

        // user1 like option1
        tx = await eventContract.userLikeGirl(0, d8(100), {from: user1})
        await showEventStatus("user1 like option 0 with 1 LIKE (100 touch)")

        // user3 like option1
        tx = await eventContract.userLikeGirl(0, d8(200), {from: user3})
        await showEventStatus("user3 like option 0 with 2 LIKE (200 touch)")

        // user2 bid option 1
        tx = await eventContract.userBidGirl(1, d8(110), {from: user2})
        await showEventStatus("user2 bid option 1 with 110 touch")

        // user3 bid option 1
        tx = await eventContract.userBidGirl(1, d8(1000), {from: user3})
        await showEventStatus("user3 bid option 1 wtih 1000 touch")

        // end like
        tx = await eventContract.setLikeEnded(winner)
        await showEventStatus("like ended")

        // end bid
        tx = await eventContract.setBidEnded()
        await showEventStatus("bid ended")

        // start a new event with 3 optons
        tx = await eventContract.startNewEvent(4)
        await showEventStatus("start a new event with 4 options")

    });
});
