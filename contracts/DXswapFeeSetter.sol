// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.0;

import './interfaces/IDXswapFactory.sol';

contract DXswapFeeSetter {
    address public owner;
    mapping(address => address) public pairOwners;
    IDXswapFactory public immutable factory;
  
    constructor(address _owner, address _factory) {
        owner = _owner;
        factory = IDXswapFactory(_factory);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, 'DXswapFeeSetter: FORBIDDEN');
        owner = newOwner;
    }
    
    function transferPairOwnership(address pair, address newOwner) external {
        require(msg.sender == owner, 'DXswapFeeSetter: FORBIDDEN');
        pairOwners[pair] = newOwner;
    }

    function setFeeTo(address feeTo) external {
        require(msg.sender == owner, 'DXswapFeeSetter: FORBIDDEN');
        factory.setFeeTo(feeTo);
    }

    function setFeeToSetter(address feeToSetter) external {
        require(msg.sender == owner, 'DXswapFeeSetter: FORBIDDEN');
        factory.setFeeToSetter(feeToSetter);
    }
    
    function setProtocolFee(uint8 protocolFeeDenominator) external {
        require(msg.sender == owner, 'DXswapFeeSetter: FORBIDDEN');
        factory.setProtocolFee(protocolFeeDenominator);
    }
    
    function setSwapFee(address pair, uint32 swapFee) external {
        require((msg.sender == owner) || ((msg.sender == pairOwners[pair])), 'DXswapFeeSetter: FORBIDDEN');
        factory.setSwapFee(pair, swapFee);
    }
}