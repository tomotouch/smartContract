pragma solidity ^0.5.4;

import './IERC20.sol';
import './DSLibrary/DSAuth.sol';

library DSMath {
    function add(uint x, uint y) internal pure returns (uint z) {
        require((z = x + y) >= x, "ds-math-add-overflow");
    }
    function sub(uint x, uint y) internal pure returns (uint z) {
        require((z = x - y) <= x, "ds-math-sub-underflow");
    }
    function mul(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x, "ds-math-mul-overflow");
    }

    function div(uint x, uint y) internal pure returns (uint z) {
        require(y > 0, "ds-math-div-overflow");
        z = x / y;
    }

    function min(uint x, uint y) internal pure returns (uint z) {
        return x <= y ? x : y;
    }
    function max(uint x, uint y) internal pure returns (uint z) {
        return x >= y ? x : y;
    }
}

interface CErc20 {
	function balanceOf(address _owner) external view returns (uint);
	function mint(uint mintAmount) external returns (uint);
	function redeemUnderlying(uint redeemAmount) external returns (uint);
	function redeem(uint redeemAmount) external returns (uint);
	function exchangeRateStored() external view returns (uint);
}

contract Staker is DSAuth {
	using DSMath for uint256;

	uint256 constant TOUCHDECIMAL = 8;
	uint256 constant STABLEDECIMAL = 6;
	uint256 constant MAXMALDEPOSIT = 100000 * (10 ** STABLEDECIMAL);

	address public touchToken;
	address public stableCoin;
	address public compound;
	uint256 public touchPrice; // offset 10 ** 6
	uint256 public principle;
	bool public actived; 

	struct DepositInfo {
		uint256 amount;
		uint256 startTime;
		uint256 period;
	}

	struct Account {
		uint256 referredCount;
		uint256 referredAmount;
		uint256 referredMilestoneAchived;
		uint256 rewards;
	}

	mapping (address => mapping (uint256 => DepositInfo)) public deposits;
	mapping (address => uint256) public userDepositsCounts;
	mapping (address => Account) public accounts;

	event UserDeposit(address indexed sender, uint256 value, uint256 timestamp, uint256 matureDate, uint256 touchAmount, uint256 depositId);
    event UserWithdraw(address indexed sender, uint256 depositAmount, uint256 value, uint256 withdrawId, uint256 timestamp);

	function active(address _touch, address _stable, address _compound) public {
		require(!actived, "contract has alreadt actived");
		actived = true;
		touchToken = _touch;
		stableCoin = _stable;
		compound = _compound;
		NonStandardIERC20Token(_stable).approve(_compound, uint256(-1));
		touchPrice = 10 ** STABLEDECIMAL;
	}

	function deposit(uint256 _amount, uint256 _period, address _referrer) external {
		require(_amount >= 500 * (10 ** STABLEDECIMAL), "the supplied amount should more than 500 USD.");
		require(_period > 0 && _period < 4, "the period should between 1 to 3 months. ");
		require(getUserTotalDepositAmount(msg.sender).add(_amount) <= MAXMALDEPOSIT, "deposit too more per user.");

		getFromUser(_amount);
		userDepositsCounts[msg.sender] += 1;
		deposits[msg.sender][userDepositsCounts[msg.sender]] = DepositInfo(_amount, getTime(), _period);
		principle = principle.add(_amount);
		
		uint256 referredBonus = 0;

		// update referral info
		if (userDepositsCounts[_referrer] != 0 && _referrer != msg.sender) {
			Account memory _referrerAccount = accounts[_referrer];
			(_referrerAccount, referredBonus) = _updateCountReward(_referrerAccount);
			_referrerAccount = _updateMilestronReward(_referrerAccount, _amount);
			accounts[_referrer] = _referrerAccount;
		}

		// check intrest in stable coin
		uint256 _equaledUSD = calIntrest(_amount, _period);
		uint256 _touchToUser = _equaledUSD.mul(10 ** 8).div(touchPrice);
		NonStandardIERC20Token(touchToken).transfer(msg.sender, _touchToUser.add(referredBonus));

		emit UserDeposit(msg.sender, _amount, getTime(), getTime() + _period * 30 days, _touchToUser.add(referredBonus), userDepositsCounts[msg.sender]);
	}

	function withdraw(address _user, uint256 _withdrawId) external {
		DepositInfo memory depositInfo = deposits[_user][_withdrawId];
		require(depositInfo.amount > 0, "the deposit has already withdrawed or not exist");
		require(getTime() >= depositInfo.startTime.add(1 days), "must deposit more than 1 days");
		require(getTime() >= depositInfo.startTime.add(depositInfo.period * 30 days) || 
			_user == msg.sender, "the stake is not ended, must withdraw by owner");
		uint256 depositAmount = depositInfo.amount;
		principle = principle.sub(depositInfo.amount);
		uint256 shouldPayToUser = calRealIntrest(_user, _withdrawId);
		depositInfo.amount = 0;
		deposits[_user][_withdrawId] = depositInfo;
		sendToUser(_user, shouldPayToUser);
		emit UserWithdraw(_user, depositAmount, shouldPayToUser, _withdrawId, block.timestamp);
	}

	function claimReferalReward(address _user) external {
		Account memory _account = accounts[_user];
		require(_account.rewards != 0, "user has no rewards");
		uint256 _amount = _account.rewards;
		_account.rewards = 0;
		accounts[_user] = _account;
		NonStandardIERC20Token(touchToken).transfer(_user, _amount);
	}

	// getter function
	function tokenBalance() public view returns (uint256) {
		uint256 balanceInDefi = CErc20(compound).balanceOf(address(this)).mul(CErc20(compound).exchangeRateStored());
		balanceInDefi = balanceInDefi / (10 ** 18);
		uint256 contractBalance = IERC20(stableCoin).balanceOf(address(this));
		return balanceInDefi.add(contractBalance);
	}

	function getProfit() public view returns (uint256) {
		uint256 _tokenBalance = tokenBalance();
		return _tokenBalance.sub(principle);
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

	function getInterestEstimate(uint256 _amount, uint256 _period) public view returns (uint256) {
		return calIntrest(_amount, _period);
	}

	function getUserTotalDepositAmount(address _user) public view returns (uint256) {
		uint256 depositsCounts = userDepositsCounts[_user];
		if(depositsCounts == 0) {
			return 0;
		}
		uint256 sum = 0;
		for(uint256 i = 0; i <= depositsCounts; i++) {
			sum = sum.add(deposits[_user][i].amount);
		}
		return sum;
	}

	// admin 
	function setTouchPrice(uint256 _price) external auth { 
		touchPrice = _price;
	}

	// owner
	function withdrawProfit() external onlyOwner {
		uint256 _profit = getProfit();
		CErc20(compound).redeemUnderlying(_profit);
		NonStandardIERC20Token(stableCoin).transfer(msg.sender, _profit);
	}

	function emergencyWithdraw() external onlyOwner {
		uint256 amount = IERC20(compound).balanceOf(address(this));
		CErc20(compound).redeem(amount);
		NonStandardIERC20Token(stableCoin).transfer(msg.sender, IERC20(stableCoin).balanceOf(address(this)));
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
		DepositInfo memory depositInfo = deposits[_user][_withdrawId];
		if (depositInfo.amount == 0) {
			return 0;
		}
		if (getTime() >= depositInfo.startTime.add(depositInfo.period * 30 days)) {
			return depositInfo.amount;
		} else {
			//require(_user == msg.sender, "the stake is not ended, must withdraw by owner");
			uint256 shouldCalculatedDays = getTime().sub(depositInfo.startTime).div(1 days);
			// APR 2.9% --> daily 0.00794521%
			uint256 _instrest = depositInfo.amount.mul(794521).mul(shouldCalculatedDays).div(10 ** 10);
			uint256 shouldRepayToUser = depositInfo.amount.add(_instrest).sub(calIntrest(depositInfo.amount, depositInfo.period));
			return shouldRepayToUser;
		}
	}

	function _updateCountReward(Account memory _account) internal view returns (Account memory, uint256) {
		Account memory __account = _account;
		uint256 referredBonus = 0;
		if (userDepositsCounts[msg.sender] == 1) {
			__account.referredCount += 1;
			referredBonus += 50 * (10 ** TOUCHDECIMAL);
			__account.rewards += (_account.referredCount / 10 * 10 + 50) * (10 ** TOUCHDECIMAL);
 		}
 		return (__account, referredBonus);
	}

	function _updateMilestronReward(Account memory _account, uint256 _amount) internal pure returns (Account memory) {
 		_account.referredAmount += _amount;
 		while(_account.referredAmount >= _account.referredMilestoneAchived + 10000 * (10 ** STABLEDECIMAL)) {
 			_account.referredMilestoneAchived += 10000 * (10 ** STABLEDECIMAL);
 			_account.rewards += (800 + 200 * (_account.referredMilestoneAchived / (10000 * (10 ** STABLEDECIMAL)))) * (10 ** TOUCHDECIMAL);
 		}
 		return _account;
	}

	function sendToUser(address _user, uint256 _amount) internal {
		CErc20(compound).redeemUnderlying(_amount);
		NonStandardIERC20Token(stableCoin).transfer(_user, _amount);
	}

	function getFromUser(uint256 _amount) internal	{
		NonStandardIERC20Token(stableCoin).transferFrom(msg.sender, address(this), _amount);
		CErc20(compound).mint(_amount);
	}
}
