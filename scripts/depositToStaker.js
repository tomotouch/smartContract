// command: truffle exec scripts/depositToStaker.js --network rinkeby

require("dotenv").config();
const DSTokenAbi = require("../abi/DSTokenAbi.json")
const StakerAbi = require("../abi/StakerAbi.json")
const IERC20Abi = require("../abi/IERC20Abi.json")

module.exports = function(callback) {
  const DSTokenAddress = "0x5348B0F23612885EecE5D97bf5a20595120bC45E"
  const StakerAddress = "0x65b8349E5de3c64306935283483951852AAB1861"
  const USDCAddress = "0x4dbcdf9b62e891a7cec5a2568c3f4faf9e8abe2b"
  
  const account = process.env.ACCOUNT
  const DSTokenContract = new web3.eth.Contract(DSTokenAbi, DSTokenAddress);
  const StakerContract = new web3.eth.Contract(StakerAbi, StakerAddress);
  const StableCoinContract = new web3.eth.Contract(IERC20Abi, USDCAddress);
  const depositAmount = web3.utils.toWei("1","ether")
  // StakerContract.methods.getTime().call().then(console.log)
  
  // 5. Mint Token
  DSTokenContract.methods.mint(account, web3.utils.toWei("20","ether")).send({from: account})
    .then(res=> {
      return DSTokenContract.methods.balanceOf(account).call()
    })
    .then(balance => {
      console.log('user\' s TOUCH balance:', balance)
      // 7. approve staker to use balance of STABLE COIN
      return StableCoinContract.methods.approve(StakerAddress, depositAmount).send({from: account, gasLimit: 750000})
    })
    .then(res => {
      // 8. deposit
      console.log('user approved staker contract')
      return StakerContract.methods.deposit(depositAmount, 1).send({from: account, gasLimit: 750000})
    })
    .then(res=> {
      console.log('user has successfully made a deposit')
    })
    .catch(err => {
      console.log('err:', err)
    })
}