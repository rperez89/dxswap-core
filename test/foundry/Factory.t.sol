// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "contracts/DXswapFactory.sol";
import "contracts/test/ERC20.sol";
import {UQ112x112} from "contracts/libraries/UQ112x112.sol";

contract FactoryTest is Test {
    DXswapFactory public factory;
    ERC20 public token0;
    ERC20 public token1;
    IDXswapPair pair;

    using UQ112x112 for uint224;

    function setUp() public {
        factory = new DXswapFactory(address(0));
        token0 = new ERC20(1000);
        token1 = new ERC20(1000);
        pair = IDXswapPair(factory.createPair(address(token0), address(token1)));
    }

    function testIncrement() public {
        assertEq(factory.allPairsLength(), 1);
    }

    function testCore() public {
        uint32 blockTimestampLast = 1900;
        uint256 balance0 = 0;
        uint256 balance1 = 0;

        uint112 reserve0 = 0;
        uint112 reserve1 = 0;
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "DXswapPair: OVERFLOW");

        uint112 _reserve0 = 1;
        uint112 _reserve1 = 1;

        uint256 price0CumulativeLast;
        uint256 price1CumulativeLast;

        vm.warp(1000);

        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        console.log(timeElapsed);
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            console.log(timeElapsed);
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
}
