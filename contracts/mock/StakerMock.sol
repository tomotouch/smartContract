pragma solidity ^0.5.4;

import '../Staker.sol';

contract StakerMock is Staker {
	uint256 public _time;

	function getTime() public view returns (uint256) {
		return _time;
	}

	function setTime(uint256 __time) public {
		_time = __time;
	}
}
