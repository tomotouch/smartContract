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
	uint256 public touchPrice; // offset 10 ** 6
	uint256 public principle;
	bool public actived; 

	event UserDeposit(address indexed sender, uint256 value, uint256 timestamp);
    event UserWithdraw(address indexed sender, uint256 value, uint256 timestamp);

	struct DepositInfo {
		uint256 amount;
		uint256 startTime;
		uint256 period;
	}

	mapping (address => mapping (uint256 => DepositInfo)) public deposits;
	mapping (address => uint256) public userDepositsCounts;

	function active(address _touch, address _stable, address _lendFMe) public {
		require(!actived, "contract has alreadt actived");
		actived = true;
		touchToken = _touch;
		stableCoin = _stable;
		lendFMe = _lendFMe;
		IERC20(_stable).approve(_lendFMe, uint256(-1));
		touchPrice = 10 ** 6;
	}

	function deposit(uint256 _amount, uint256 _period) external {
		require(_amount >= 500000000, "the supplied amount should more than 500 USD.");
		require(_period > 0 && _period < 4, "the period should between 1 to 3 months. ");
		getFromUser(_amount);
		userDepositsCounts[msg.sender] += 1;
		deposits[msg.sender][userDepositsCounts[msg.sender]] = DepositInfo(_amount, getTime(), _period);
		principle += _amount;

		// check intrest in stable coin
		uint256 _equaledUSD = calIntrest(_amount, _period);
		uint256 _touchToUser = _equaledUSD * (10 ** 6) / touchPrice;
		IERC20(touchToken).transfer(msg.sender, _touchToUser);

		emit UserDeposit(msg.sender, _amount, block.timestamp);
	}

	function withdraw(uint256 _withdrawId) external {
		DepositInfo memory depositInfo = deposits[msg.sender][_withdrawId];
		require(depositInfo.amount > 0, "the deposit has already withdrawed or not exist");
		principle -= depositInfo.amount;
		uint256 shouldPayToUser = calRealIntrest(msg.sender, _withdrawId);
		depositInfo.amount = 0;
		deposits[msg.sender][_withdrawId] = depositInfo;
		sendToUser(shouldPayToUser);
		emit UserWithdraw(msg.sender, shouldPayToUser, block.timestamp);
	} 

	// getter function
	function tokenBalance() public view returns (uint256) {
		uint256 balanceInDefi = ILendFMe(lendFMe).getSupplyBalance(address(this), stableCoin);
		return balanceInDefi + IERC20(stableCoin).balanceOf(address(this));
	}

	function getProfit() public view returns (uint256) {
		uint256 _tokenBalance = tokenBalance();
		return _tokenBalance - principle;
	}

	function getTime() public view returns (uint256) {
		return now;
	}

	function getTouchPrice() public view returns (uint256) {
		return touchPrice;
	}

	function getWithdrawAmountEstimate(address _user, uint256 _withdrawId) public view returns (uint256) {
		return calRealIntrest(_user, _withdrawId);
	} 

	// admin 
	function setTouchPrice(uint256 _price) external auth { 
		touchPrice = _price;
	}

	// owner
	function withdrawProfit() external onlyOwner {
		uint256 _profit = getProfit();
		ILendFMe(lendFMe).withdraw(stableCoin, _profit);
		IERC20(stableCoin).transfer(msg.sender, _profit);
	}

	// internal
	function calIntrest(uint256 _amount, uint256 _period) internal view returns (uint256) {
		if(_period == 3) { // 3 months, APR = 10%
			return _amount * 10 / 100 / 4;
		} else if (_period == 2) { // 2 month, APR = 8 %
			return _amount * 8 / 100 / 6;
		} else if (_period == 1) { // 1 month, APR = 6 %
			return _amount * 6 / 100 / 12;
		}
		return 0;
	}

	function calRealIntrest(address _user, uint256 _withdrawId) internal view returns (uint256) {
		DepositInfo memory depositInfo = deposits[msg.sender][_withdrawId];
		if (depositInfo.amount == 0) {
			return 0;
		}
		if (getTime() >= depositInfo.startTime + depositInfo.period * 30 days) {
			return depositInfo.amount;
		} else {
			uint256 shouldCalculatedDays = (depositInfo.startTime + depositInfo.period * 30 days - depositInfo.startTime - 1 days) / 1 days;
			// APR 2.9% --> daily 0.00794521%
			uint256 _instrest = depositInfo.amount * 794521 * shouldCalculatedDays / (10 ** 10);
			uint256 shouldRepayToUser = depositInfo.amount + _instrest - calIntrest(depositInfo.amount, depositInfo.period);
			return shouldRepayToUser;
		}
	}

	function sendToUser(uint256 _amount) internal {
		ILendFMe(lendFMe).withdraw(stableCoin, _amount);
		IERC20(stableCoin).transfer(msg.sender, _amount);
	}

	function getFromUser(uint256 _amount) internal	{
		IERC20(stableCoin).transferFrom(msg.sender, address(this), _amount);
		ILendFMe(lendFMe).supply(stableCoin, _amount);
	}
}
