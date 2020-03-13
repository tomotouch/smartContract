const Staker = artifacts.require("./Staker.sol");
const DSToken = artifacts.require("./contracts/DSLibrary/DSToken.sol");
const web3 = require("web3")

module.exports = function(_deployer) {
  // Use deployer to state migration tasks.
  _deployer.deploy(Staker);
  _deployer.deploy(DSToken, web3.utils.fromAscii("TOUCH"), 8);
};
