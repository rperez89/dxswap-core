// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity >=0.8.0;

import '../DXswapERC20.sol';

contract ERC20 is DXswapERC20 {
    constructor(uint _totalSupply) {
        _mint(msg.sender, _totalSupply);
    }
}
