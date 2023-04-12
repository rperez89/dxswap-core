// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "contracts/DXswapFactory.sol";
import "contracts/test/ERC20.sol";
import {UQ112x112} from "contracts/libraries/UQ112x112.sol";

contract PairTest is Test {
    DXswapFactory public factory;
    ERC20 public token0;
    ERC20 public token1;
    IDXswapPair pair;
    uint32 blockTimestampLast;
    uint112 reserve0 = 0;
    uint112 reserve1 = 0;
    uint256 price0CumulativeLast;
    uint256 price1CumulativeLast;

    using UQ112x112 for uint224;

    function setUp() public {}

    function testOverflow() public {
        blockTimestampLast = 4294967295;
        vm.warp(4294967297);

        uint256 balance0 = 1;
        uint256 balance1 = 2;

        // expect revert next line
        vm.expectRevert(stdError.arithmeticError);
        _update(balance0, balance1, 3, 4);

        _updateUnchecked(balance0, balance1, 3, 4);
        assertEq(reserve0, balance0);
        assertEq(reserve1, balance1);
    }

    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "DXswapPair: OVERFLOW");
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired @audit should be in unchecked block
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        // emit Sync(reserve0, reserve1);
        console.log(reserve0, reserve1);
    }

    function _updateUnchecked(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "DXswapPair: OVERFLOW");
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        unchecked {
            uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
            if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
                // * never overflows, and + overflow is desired
                price0CumulativeLast += uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
                price1CumulativeLast += uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
            }
        }
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        // emit Sync(reserve0, reserve1);
        console.log(reserve0, reserve1);
    }
}
