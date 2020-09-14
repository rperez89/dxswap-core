pragma solidity =0.5.16;

import './DXswapFactory.sol';
import './interfaces/IDXswapPair.sol';
import './interfaces/IERC20.sol';
import './libraries/SafeMath.sol';


contract DXswapDeployer {
    using SafeMath for uint;
    
    enum DeployerState {
      CREATED, APPROVED, DEPLOY, FINISHED
    }
    
    address payable public dxdaoAvatar;
    DeployerState public state;
    uint256 public SEED_AMOUNT_TOKEN_A = 1 ether;

    struct TokenPair {
      address tokenA;
      address tokenB;
      uint8 swapFee;
      address originPair;
      uint256 cumulativeQuote;
    }
    
    TokenPair[] public initialTokenPairs;
    
    uint startSyncTime;
    uint minimunSyncTime = 1800; // 30 minutes in seconds
    uint actualSyncPeriod = 0;
    uint syncPeriods = 6; // Will sync six times at least every 1800 seconds;
    
    // Step 1: Create the deployer contract with all the needed information for deployment.
    constructor(
        address payable _dxdaoAvatar,
        address[] memory tokensA,
        address[] memory tokensB,
        uint8[] memory swapFees,
        address[] memory originPairs
    ) public {
        dxdaoAvatar = _dxdaoAvatar;
        for(uint8 i = 0; i < tokensA.length; i ++) {
            initialTokenPairs.push(
                TokenPair(
                    tokensA[i],
                    tokensB[i],
                    swapFees[i],
                    originPairs[i],
                    0
                )
            );
        }
        state = DeployerState.CREATED;
    }
    
    // Step 2: Transfer ETH from the DXdao avatar to allow the deploy function to be called.
    function() external payable {
        require(state == DeployerState.CREATED);
        require(msg.sender == dxdaoAvatar, 'DXswapDeployer: CALLER_NOT_FEE_TO_SETTER');
        state = DeployerState.APPROVED;
        startSyncTime = block.timestamp;
    }
    
    // Step 3: Update the initial quote for a period of time to have a more precise initial quote for deployment
    function updateQuotes() public {
      require(state == DeployerState.APPROVED);
      require(block.timestamp >= startSyncTime.add(actualSyncPeriod.mul(minimunSyncTime)));
      for(uint8 i = 0; i < initialTokenPairs.length; i ++) {
          (uint reserve0, uint reserve1,) = IDXswapPair(initialTokenPairs[i].originPair).getReserves();
          uint256 seedAmountTokenB = SEED_AMOUNT_TOKEN_A.mul(reserve1) / reserve0;
          initialTokenPairs[i].cumulativeQuote = initialTokenPairs[i].cumulativeQuote.add(seedAmountTokenB);
      }
      actualSyncPeriod = actualSyncPeriod.add(1);
      if (actualSyncPeriod == syncPeriods){
        state = DeployerState.DEPLOY;
      }
    }
    
    // Step 4: Deploy DXswapFactory and all initial pairs with an initial liquidty using a initial quote based on 
    // the cumulative quotes taken during the sync time.
    function deploy() public {
      require(state == DeployerState.DEPLOY);
        DXswapFactory dxSwapFactory = new DXswapFactory(dxdaoAvatar);
        for(uint8 i = 0; i < initialTokenPairs.length; i ++) {
            address newPair = dxSwapFactory.createPair(initialTokenPairs[i].tokenA, initialTokenPairs[i].tokenB);
            uint256 seedAmountTokenB = initialTokenPairs[i].cumulativeQuote / syncPeriods;
            if (
                (IERC20(initialTokenPairs[i].tokenA).balanceOf(address(this)) >= SEED_AMOUNT_TOKEN_A)
                && (IERC20(initialTokenPairs[i].tokenB).balanceOf(address(this)) >= seedAmountTokenB)
            ) {
                IERC20(initialTokenPairs[i].tokenA).transfer(newPair, SEED_AMOUNT_TOKEN_A);
                IERC20(initialTokenPairs[i].tokenB).transfer(newPair, seedAmountTokenB);
                IDXswapPair(newPair).mint(dxdaoAvatar);
                dxSwapFactory.setSwapFee(newPair, initialTokenPairs[i].swapFee);
            }
        }
        dxSwapFactory.setFeeTo(dxdaoAvatar);
        dxSwapFactory.setFeeToSetter(dxdaoAvatar);
        state = DeployerState.FINISHED;
    }
    
    // Step 5: Take tokens back too dxdao
    function takeTokensBack(address[] memory tokens) public {
      require(state == DeployerState.FINISHED);
      for(uint8 i = 0; i < tokens.length; i ++) {
        IERC20(tokens[i]).transfer(dxdaoAvatar, IERC20(tokens[i]).balanceOf(address(this)));
      }
      dxdaoAvatar.transfer(address(this).balance);
    }
    
  
}
