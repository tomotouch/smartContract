const TouchEvent = artifacts.require("./TouchEvent.sol");
const Staker = artifacts.require("./Staker.sol");
const FakeLendFMe = artifacts.require("./mock/FakeLendFMe.sol");
const Touch = artifacts.require("./contracts/DSLibrary/DSToken.sol");
const StableCoin = artifacts.require("./contracts/DSLibrary/DSToken.sol");
const web3 = require("web3")

module.exports = function (deployer, network, accounts) {
  const account = accounts[0]
  deployer.then(async () => {
    // deployments
    await deployer.deploy(Staker)
    await deployer.deploy(FakeLendFMe)
    await deployer.deploy(StableCoin, web3.utils.fromAscii("USDT"), 6)
    await deployer.deploy(Touch, web3.utils.fromAscii("TOUCH"), 8)

    // instances
    let fakeLendFMe = await FakeLendFMe.deployed()
    let stableCoin = await StableCoin.deployed()
    let touch = await Touch.deployed()
    let staker = await Staker.deployed()

    await deployer.deploy(TouchEvent, touch.address)
    let touchEvent = await TouchEvent.deployed()

    // active staker
    await staker.active(touch.address,stableCoin.address,fakeLendFMe.address)

    // mint TOUCH to Staker
    await touch.mint(staker.address, web3.utils.toWei('1', 'ether'))
    const stakerTouchBalance = await touch.balanceOf(staker.address)
    console.log("staker's touch balance: ", web3.utils.fromWei(stakerTouchBalance), " ether")
    
    // mint StableCoin to user
    await stableCoin.mint(account, web3.utils.toWei('1000', 'ether'))

    // start new event
    await touchEvent.startNewEvent(4)


    console.log('fakeLendFMe address:', fakeLendFMe.address)
    console.log('stableCoin address:', stableCoin.address)
    console.log('touch address:', touch.address)
    console.log('staker address:', staker.address)
    console.log('touchEvent address:', touchEvent.address)

    // return Promise.all([
    //   PRInstance.init(DistributeToken.address, TokenRegistry.address, ReputationRegistry.address, PLCRVoting.address),
    // ])
  })
}