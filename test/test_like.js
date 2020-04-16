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
    const user4 = accounts[4]
    const user5 = accounts[5]
    const user6 = accounts[6]
    const user7 = accounts[7]
    const user8 = accounts[8]
    const user9 = accounts[9]
    const bidProfitBeneficiary = accounts[10]

    let tx, currentTime
    let lendFMe, staker, eventContract 
    let usdt, touch

    const d18 = function (amount) {
        amount = new BN(amount)
        return web3.utils.toWei(amount, "ether")
    }

    const d8 = function (amount) {
        return amount * 100000000
    }

    const f18 = function (amount) {
        amount = new BN(amount)
        return web3.utils.fromWei(amount, "ether")
    }

    const f8 = function (amount) {
        return amount / 100000000
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
        console.log("most liked option: ", _event.mostLikedOption.toString())
        console.log("current like reward pool: ", f8(_event.totalLikedRewards).toString())
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

    const showDistributedResult = async function (_eventId, note) {
        console.log("-------------------------------------------")
        console.log("** " + note)
        let _event = await eventContract.events(_eventId)
        console.log("current event id: ", _eventId.toString())
        console.log("is liked eneded? ", (await eventContract.eventIsLikeEnded(_eventId)))
        console.log("is bid ended? ", (await eventContract.eventIsBidEnded(_eventId)))
        console.log("event's options: ", _event.options.toString())
        console.log("event's total liked: ", f8(_event.totalLiked))
        console.log("top bidder: ", (await _event.firstBidder))
        console.log("bid: ", f8(_event.firstBid).toString())
        console.log("most liked option: ", _event.mostLikedOption.toString())
        console.log("current like reward pool: ", f8(_event.totalLikedRewards).toString())
        console.log("current option: ", _event.currentOption.toString())
        console.log("user reward")
        console.log("\tuser1: ", f8(await eventContract.getLikedRewardAmount(_eventId, user1)))
        console.log("\tuser2: ", f8(await eventContract.getLikedRewardAmount(_eventId, user2)))
        console.log("\tuser3: ", f8(await eventContract.getLikedRewardAmount(_eventId, user3)))
        console.log("\tuser4: ", f8(await eventContract.getLikedRewardAmount(_eventId, user4)))
        console.log("\tuser5: ", f8(await eventContract.getLikedRewardAmount(_eventId, user5)))
        console.log("\tuser6: ", f8(await eventContract.getLikedRewardAmount(_eventId, user6)))
        console.log("\tuser7: ", f8(await eventContract.getLikedRewardAmount(_eventId, user7)))
        console.log("\tuser8: ", f8(await eventContract.getLikedRewardAmount(_eventId, user8)))
        console.log("\tuser9: ", f8(await eventContract.getLikedRewardAmount(_eventId, user9)))
    }

    const showUserTouchBalance = async function () {
        console.log("touch balance")
        console.log("\tuser1: ", f8(await touch.balanceOf(user1)))
        console.log("\tuser2: ", f8(await touch.balanceOf(user2)))
        console.log("\tuser3: ", f8(await touch.balanceOf(user3)))
        console.log("\tuser4: ", f8(await touch.balanceOf(user4)))
        console.log("\tuser5: ", f8(await touch.balanceOf(user5)))
        console.log("\tuser6: ", f8(await touch.balanceOf(user6)))
        console.log("\tuser7: ", f8(await touch.balanceOf(user7)))
        console.log("\tuser8: ", f8(await touch.balanceOf(user8)))
        console.log("\tuser9: ", f8(await touch.balanceOf(user9)))
    }

    it("go through", async function () {
        touch = await DSToken.new("0x444600000000000000000000000000", 8)
        eventContract = await EventContract.new(touch.address);

        tx = await touch.mint(user1, d8(200))
        tx = await touch.mint(user2, d8(200))
        tx = await touch.mint(user3, d8(1000))
        tx = await touch.mint(user4, d8(200))
        tx = await touch.mint(user5, d8(200))
        tx = await touch.mint(user6, d8(1000))
        tx = await touch.mint(user7, d8(200))
        tx = await touch.mint(user8, d8(200))
        tx = await touch.mint(user9, d8(1000))

        tx = await touch.approvex(eventContract.address, {from: user1})
        tx = await touch.approvex(eventContract.address, {from: user2})
        tx = await touch.approvex(eventContract.address, {from: user3})
        tx = await touch.approvex(eventContract.address, {from: user4})
        tx = await touch.approvex(eventContract.address, {from: user5})
        tx = await touch.approvex(eventContract.address, {from: user6})
        tx = await touch.approvex(eventContract.address, {from: user7})
        tx = await touch.approvex(eventContract.address, {from: user8})
        tx = await touch.approvex(eventContract.address, {from: user9})

        tx = await eventContract.setBidProfitBeneficiary(bidProfitBeneficiary)

        // init
        await showEventStatus("event contract init")

        // start a new event with 4 options
        tx = await eventContract.startNewEvent(4)
        await showEventStatus("start a new event with 4 options")

        // put 77777 to liked pool
        tx = await touch.mint(owner, d8(77777))
        tx = await touch.approvex(eventContract.address, {from: owner})
        tx = await eventContract.addTouchToLikeRewardPool(d8(77777), {from: owner})
        await showEventStatus("put 77777 touch to liked pool")

        // user1 like option0 with 1 like
        tx = await eventContract.userLikeGirl(0, d8(100), {from: user1})
        await showEventStatus("user1 like option 0 with 1 LIKE (100 touch)")

        // user2 like option0 with 2 like
        tx = await eventContract.userLikeGirl(0, d8(200), {from: user2})
        await showEventStatus("user3 like option 0 with 2 LIKE (200 touch)")

        // user1 like option0 with 1 like
        tx = await eventContract.userLikeGirl(0, d8(100), {from: user1})
        await showEventStatus("user1 like option 0 with 1 LIKE (100 touch)")

        // user3 like option0 with 10 like
        tx = await eventContract.userLikeGirl(0, d8(1000), {from: user3})
        await showEventStatus("user3 like option 0 with 10 LIKE (1000 touch)")

        // user4 like option1 with 2 like
        tx = await eventContract.userLikeGirl(1, d8(200), {from: user4})
        await showEventStatus("user4 like option 1 with 2 LIKE (200 touch)")

        // user5 like option1 with 2 like
        tx = await eventContract.userLikeGirl(1, d8(200), {from: user5})
        await showEventStatus("user5 like option 1 with 2 LIKE (200 touch)")

        // user6 like option1 with 5 like
        tx = await eventContract.userLikeGirl(1, d8(500), {from: user6})
        await showEventStatus("user6 like option 1 with 5 LIKE (500 touch)")

        // user6 like option0 with 5 like
        tx = await eventContract.userLikeGirl(0, d8(500), {from: user6})
        await showEventStatus("user6 like option 0 with 5 LIKE (500 touch)")

        // user7 like option2 with 2 like
        tx = await eventContract.userLikeGirl(2, d8(200), {from: user7})
        await showEventStatus("user7 like option 2 with 2 LIKE (200 touch)")

        // user8 like option3 with 2 like
        tx = await eventContract.userLikeGirl(3, d8(200), {from: user8})
        await showEventStatus("user8 like option 3 with 2 LIKE (200 touch)")

        // user9 like option2 with 10 like
        tx = await eventContract.userLikeGirl(2, d8(1000), {from: user9})
        await showEventStatus("user9 like option 2 with 10 LIKE (1000 touch)")

        // end like
        tx = await eventContract.setLikeEnded()
        await showEventStatus("like ended")
        await showDistributedResult(1, "distributed result")

    });
});
