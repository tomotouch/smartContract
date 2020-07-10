pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

contract TOUCH is ERC20, ERC20Detailed{

    /**
     * Constructor function
     *
     * Initializes contract with initial supply tokens to the creator of the contract
     */
    constructor(
        uint256 initialSupply
    ) ERC20Detailed('TomoTouch Coin', 'TOUCH', 8) public {
        _mint(msg.sender, initialSupply * (10 ** 8));
    }
}