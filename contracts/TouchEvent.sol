pragma solidity ^0.5.4;

import './IERC20.sol';
import './DSLibrary/DSAuth.sol';
import './DSLibrary/DSMath.sol';

contract TouchEvent is DSAuth, DSMath{

	address public touchToken;
	bool public isLikeEnded = true;
	bool public isBidEnded = true;
	uint256 public eventCounts;
	mapping(uint256 => Event) public events;
	mapping(uint256 => mapping(uint256 => Option)) public options;

	event eventEnds(string eventName);

	struct Event {
		uint256 eventId;
		uint256 options;
		uint256 totalLiked;
	}

	struct Option {
		uint256 likes;
		uint256 firstBid;
		address firstBidder;
	}

	constructor(address _token) public {
		touchToken = _token;
	}

	function userLikeGirl(uint256 _option, uint256 _amounts) external {
		Event memory event_ = events[eventCounts];
		require(!isLikeEnded, "like is ended");
		require(_option <= event_.options, "the option is not exist");
		IERC20(touchToken).transferFrom(msg.sender, address(this), _amounts);
		Option memory option = options[eventCounts][_option];
		option.likes += _amounts;
		event_.totalLiked += _amounts;
		options[eventCounts][_option] = option;
		events[eventCounts] = event_;
	}

	function userBidGirl(uint256 _option, uint256 _price) external {
		Event memory event_ = events[eventCounts];
		require(!isBidEnded, "bid is ended");
		require(_option <= event_.options, "the option is not exist");
		Option memory option = options[eventCounts][_option];
		require(_price > option.firstBid, "does not exceed the first bid");
		if (option.firstBidder == address(0)) {
			option.firstBidder = address(this);
		}
		IERC20(touchToken).transferFrom(msg.sender, option.firstBidder, _price);
		option.firstBidder = msg.sender;
		option.firstBid = _price;
		options[eventCounts][_option] = option;
	}

	// admin
	function startNewEvent (uint256 _optionCounts) external auth {
		require(isLikeEnded && isBidEnded, "some events are still running");
		isLikeEnded = false;
		isBidEnded = false;
		eventCounts += 1;
		events[eventCounts] = Event(eventCounts, _optionCounts, 0);
	}

	function setLikeEnded() external auth {
		isLikeEnded = true;
		emit eventEnds("Vote");
	}

	function setBidEnded() external auth {
		isBidEnded = true;
		emit eventEnds("Bid");
	}

}
