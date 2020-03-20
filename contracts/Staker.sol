pragma solidity ^0.5.4;

import './IERC20.sol';
import './DSLibrary/DSAuth.sol';
import './DSLibrary/DSMath.sol';

interface ILendFMe {
	function supply(address _token, uint _amounts) external returns (uint);
	function withdraw(address _token, uint _amounts) external returns (uint);
	function getSupplyBalance(address _user, address _token) external view returns (uint256);
}

contract Staker is DSAuth, DSMath {
	address public touchToken;
	address public stableCoin;
	address public lendFMe;
	uint256 public touchPrice;
	uint256 public principle;
	bool public actived; 

	struct DepositInfo {
		uint256 amount;
		uint256 startTime;
		uint256 period;
	}

	mapping (address => mapping (uint256 => DepositInfo)) public deposits;
	mapping (address => uint256) public userDepositsCounts;

	event userDeposit(address indexed sender, uint256 value, uint256 timestamp, uint256 matureDate);
    event userWithdraw(address indexed sender, uint256 value, uint256 timestamp);

	function active(address _touch, address _stable, address _lendFMe) public {
		require(!actived, "contract has alreadt actived");
		actived = true;
		touchToken = _touch;
		stableCoin = _stable;
		lendFMe = _lendFMe;
		IERC20(_stable).approve(_lendFMe, uint256(-1));
		touchPrice = 1;
	}

	function deposit(uint256 _amount, uint256 _period) external {
		require(_amount >= 500000000, "the supplied amount should be greater than 500.");
		require(_period > 0 && _period < 4, "the period should between 1 to 3 months. ");
		getFromUser(_amount);
		userDepositsCounts[msg.sender] += 1;
		deposits[msg.sender][userDepositsCounts[msg.sender]] = DepositInfo(_amount, getTime(), _period);

		// check intrest in stable coin
		uint256 _equaledUSD = calIntrest(_amount, _period);
		uint256 _touchToUser = _equaledUSD / touchPrice;
		IERC20(touchToken).transfer(msg.sender, _touchToUser);
		emit userDeposit(msg.sender, _amount, getTime(), getTime() + _period * 30 days);
	}

	function withdraw(uint256 _withdrawId) external {
		DepositInfo memory depositInfo = deposits[msg.sender][_withdrawId];
		require(depositInfo.amount > 0, "the deposit has already withdrawed or not exist");
		if (getTime() >= depositInfo.startTime + depositInfo.period * 30 days) {
			sendToUser(depositInfo.amount);
		} else {
			uint256 shouldCalculatedDays = (depositInfo.startTime + depositInfo.period * 30 days - depositInfo.startTime) / 1 days;
			// APR 2.9% --> daily 0.00794521%
			uint256 _instrest = depositInfo.amount * 794521 * shouldCalculatedDays / (10 ** 10);
			uint256 shouldRepayToUser = depositInfo.amount + _instrest - calIntrest(depositInfo.amount, depositInfo.period);
			sendToUser(shouldRepayToUser);
		}
	} 

	// getter function
	function tokenBalance(address _token) public view returns (uint256) {
		uint256 balanceInDefi = ILendFMe(lendFMe).getSupplyBalance(address(this), stableCoin);
		return balanceInDefi + IERC20(stableCoin).balanceOf(address(this));
	}

	function getProfit(address _token) public view returns (uint256) {
		uint256 _tokenBalance = tokenBalance(_token);
		return _tokenBalance - principle;
	}

	function getTime() public view returns (uint256) {
		return now;
	}

	//admin 
	function setTOUCHPRice(uint256 _price) external auth { 
		touchPrice = _price;
	}

	// internal
	function calIntrest(uint256 _amount, uint256 _period) internal returns (uint256) {
		uint256 result = _amount;
		if(_period == 3) { // 3 months, APR = 10%
			return _amount * 10 / 100 / 4;
		} else if (_period == 2) { // 2 month, APR = 8 %
			return _amount * 8 / 100 / 6;
		} else if (_period == 1) { // 1 month, APR = 6 %
			return _amount * 6 / 100 / 12;
		}
		return 0;
	}

	function sendToUser(uint256 _amount) internal {
		ILendFMe(lendFMe).withdraw(stableCoin, _amount);
		IERC20(stableCoin).transfer(msg.sender, _amount);
		principle -= _amount;
		emit userWithdraw(msg.sender, _amount, block.timestamp);
	}

	function getFromUser(uint256 _amount) internal	{
		IERC20(stableCoin).transferFrom(msg.sender, address(this), _amount);
		ILendFMe(lendFMe).supply(stableCoin, _amount);
		principle += _amount;
	}
}
