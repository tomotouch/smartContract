pragma solidity ^0.5.4;

import './IERC20.sol';
import './DSLibrary/DSAuth.sol';
import './DSLibrary/DSMath.sol';

contract TouchEvent is DSAuth, DSMath{

	address public touchToken;
	address public bidProfitBeneficiary;
	bool public isLikeEnded = true;
	bool public isBidEnded = true;
	uint256 public eventCounts;
	mapping(uint256 => Event) public events;
	mapping(uint256 => mapping(uint256 => Option)) public options;
	mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public options_userLike;
	mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public options_addr2Id;
	mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) public options_id2Addr;

	event EventEnds(string eventName);

	struct Event {
		uint256 eventId;
		uint256 options;
		uint256 currentOption;
		uint256 totalLiked;
		uint256 firstBid;
		address firstBidder;
	}

	struct Option {
		uint256 likes;
		uint256 uniqueLike;
	}

	constructor(address _token) public {
		touchToken = _token;
	}

	function userLikeGirl(uint256 _option, uint256 _amounts) external {
		Event memory event_ = events[eventCounts];
		require(!isLikeEnded, "like is ended");
		require(_option <= event_.options, "the option is not exist");
		IERC20(touchToken).transferFrom(msg.sender, address(this), _amounts);
		Option memory option_ = options[eventCounts][_option];
		option_.likes += _amounts;
		event_.totalLiked += _amounts;
		if(options_addr2Id[eventCounts][_option][msg.sender] == 0) {
			option_.uniqueLike += 1;
			options_addr2Id[eventCounts][_option][msg.sender] = option_.uniqueLike;
			options_id2Addr[eventCounts][_option][option_.uniqueLike] = msg.sender;
		}
		options_userLike[eventCounts][_option][msg.sender] += _amounts;

		options[eventCounts][_option] = option_;
		events[eventCounts] = event_;
	}

	function userBidGirl(uint256 _option, uint256 _price) external {
		Event memory event_ = events[eventCounts];
		require(!isBidEnded, "bid is ended");
		require(_option <= event_.options, "the option is not exist");
		require(msg.sender != event_.firstBidder, "the sender is already the top bidder");
		require(_price > event_.firstBid, "does not exceed the first bid");
		
		if (event_.firstBidder == address(0)) {
			event_.firstBidder = bidProfitBeneficiary;
		}

		uint256 _amountsToOwner = (_price - event_.firstBid)/5;
		IERC20(touchToken).transferFrom(msg.sender, bidProfitBeneficiary, _amountsToOwner);
		IERC20(touchToken).transferFrom(msg.sender, event_.firstBidder, _price - _amountsToOwner);
		event_.firstBidder = msg.sender;
		event_.firstBid = _price;
		event_.currentOption = _option;
		events[eventCounts] = event_;
	}

	// getting function 
	function getOptionLiker(uint256 _eventId, uint256 _optionId, uint256 _startedId, uint256 _length) public view returns (address[] memory) {
		address[] memory result = new address[](_length);
		for(uint256 i = 0; i < _length; ++i) {
			result[i] = options_id2Addr[_eventId][_optionId][_startedId + i + 1];
		}
		return result;
	}

	// admin
	function startNewEvent (uint256 _optionCounts) external auth {
		require(isLikeEnded && isBidEnded, "some events are still running");
		isLikeEnded = false;
		isBidEnded = false;
		eventCounts += 1;
		events[eventCounts] = Event(eventCounts, _optionCounts, 0, 0, 0, address(0));
	}

	function setLikeEnded() external auth {
		isLikeEnded = true;
		emit EventEnds("Vote");
	}

	function setBidEnded() external auth {
		isBidEnded = true;
		emit EventEnds("Bid");
	}

	// owner
	function setBidProfitBeneficiary(address _user) external onlyOwner {
		bidProfitBeneficiary = _user;
	}

}
