// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "contracts/DXswapFactory.sol";
import {DXswapLibrary} from "contracts/libraries/DXswapLibrary.sol";
import "contracts/test/ERC20.sol";

contract FactoryTest is Test {
    DXswapFactory public factory;
    ERC20 public token0;
    ERC20 public token1;
    IDXswapPair pair;
    IDXswapPair pairReverted;

    function setUp() public {
        factory = new DXswapFactory(address(0));
        token0 = new ERC20(1000);
        token1 = new ERC20(1000);
        pair = IDXswapPair(factory.createPair(address(token0), address(token1)));
    }

    function testIfPair2() public {
        bytes memory bytecode = type(DXswapPair).creationCode;
        bytes32 bytecode256 = keccak256(abi.encodePacked(bytecode));
        bytes32 salt = keccak256(
            abi.encodePacked(0x1000000000000000000000000000000000000000, 0x2000000000000000000000000000000000000000)
        );
        console.logBytes32(bytecode256);
        console.logBytes32(salt);
    }

    function testIfPair() public {
        IDXswapPair pair2 = IDXswapPair(
            factory.createPair(
                address(0x1000000000000000000000000000000000000000), address(0x2000000000000000000000000000000000000000)
            )
        );
        assertEq(address(pair2), address(0x546735AF283237F24cF3cF49BA0D3923C4234F0D));
        console.log(address(factory));
        console.log(address(pair2));
    }

    function testIfPairCreated() public {
        assertEq(factory.allPairsLength(), 1);
    }

    function testIfInitHashCodeItsCorrect() public {
        console.log(address(pair));
        address pairAddress = DXswapLibrary.pairFor(address(factory), address(token0), address(token1));
        console.log(pairAddress);
        assertEq(address(pair), pairAddress);
    }

    function testIfInitHashCodeItsInDiffOrder() public {
        console.log(address(pair));
        address pairAddress = DXswapLibrary.pairFor(address(factory), address(token1), address(token0));
        console.log(pairAddress);
        assertEq(address(pair), pairAddress);
    }

    function testIfPairAlreadyExistTokenInverted() public {
        vm.expectRevert("DXswapFactory: PAIR_EXISTS");
        pairReverted = IDXswapPair(factory.createPair(address(token1), address(token0)));
    }
}
