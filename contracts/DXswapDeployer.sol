// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity >=0.8.0;

import './DXswapFactory.sol';
import './interfaces/IDXswapPair.sol';
import './DXswapFeeSetter.sol';
import './DXswapFeeReceiver.sol';

contract DXswapDeployer {
    address payable public protocolFeeReceiver;
    address payable public dxdaoAvatar;
    address public WETH;
    uint8 public state = 0;

    struct TokenPair {
        address tokenA;
        address tokenB;
        uint32 swapFee;
    }

    // EVENTS
    event TransferSuccess();
    event TransferFailure();

    TokenPair[] public initialTokenPairs;

    event FeeReceiverDeployed(address feeReceiver);
    event FeeSetterDeployed(address feeSetter);
    event PairFactoryDeployed(address factory);
    event PairDeployed(address pair);

    // Step 1: Create the deployer contract with all the needed information for deployment.
    constructor(
        address payable _protocolFeeReceiver,
        address payable _dxdaoAvatar,
        address _WETH,
        address[] memory tokensA,
        address[] memory tokensB,
        uint32[] memory swapFees
    ) {
        dxdaoAvatar = _dxdaoAvatar;
        WETH = _WETH;
        protocolFeeReceiver = _protocolFeeReceiver;
        for (uint8 i = 0; i < tokensA.length; i++) {
            initialTokenPairs.push(TokenPair(tokensA[i], tokensB[i], swapFees[i]));
        }
    }

    // Step 2: Transfer ETH from the DXdao avatar to allow the deploy function to be called.
    receive() external payable {
        require(state == 0, 'DXswapDeployer: WRONG_DEPLOYER_STATE');
        require(msg.sender == dxdaoAvatar, 'DXswapDeployer: CALLER_NOT_FEE_TO_SETTER');
        state = 1;
    }

    // Step 3: Deploy DXswapFactory and all initial pairs
    function deploy() external {
        require(state == 1, 'DXswapDeployer: WRONG_DEPLOYER_STATE');

        DXswapFactory dxSwapFactory = new DXswapFactory(address(this));

        emit PairFactoryDeployed(address(dxSwapFactory));

        for (uint8 i = 0; i < initialTokenPairs.length; i++) {
            address newPair = dxSwapFactory.createPair(initialTokenPairs[i].tokenA, initialTokenPairs[i].tokenB);
            dxSwapFactory.setSwapFee(newPair, initialTokenPairs[i].swapFee);
            emit PairDeployed(address(newPair));
        }
        DXswapFeeReceiver dxSwapFeeReceiver = new DXswapFeeReceiver(
            dxdaoAvatar,
            address(dxSwapFactory),
            WETH,
            protocolFeeReceiver,
            dxdaoAvatar
        );
        emit FeeReceiverDeployed(address(dxSwapFeeReceiver));
        dxSwapFactory.setFeeTo(address(dxSwapFeeReceiver));

        DXswapFeeSetter dxSwapFeeSetter = new DXswapFeeSetter(dxdaoAvatar, address(dxSwapFactory));
        emit FeeSetterDeployed(address(dxSwapFeeSetter));
        dxSwapFactory.setFeeToSetter(address(dxSwapFeeSetter));
        state = 2;
        withdrawCall();
    }

    // //function to withdraw all ETH from the contract
    // function withdrawSend() external {
    //     bool success = payable(msg.sender).send(10 ether);
    //     if (success) {
    //         emit TransferSuccess();
    //     } else {
    //         emit TransferFailure();
    //     }
    // }

    function withdrawCall() public {
        uint value = address(this).balance;
        address payable to = payable(msg.sender);
        (bool success, ) = payable(to).call{value: value}(new bytes(0));
        if (success) {
            emit TransferSuccess();
        } else {
            emit TransferFailure();
        }
    }
}
