import dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/types'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import '@typechain/hardhat'
import 'hardhat-dependency-compiler'
import 'hardhat-deploy'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import '@matterlabs/hardhat-zksync-deploy'
import '@matterlabs/hardhat-zksync-solc'
import '@matterlabs/hardhat-zksync-verify'
import '@matterlabs/hardhat-zksync-chai-matchers'

dotenv.config()

const infuraKey = process.env.INFURA_KEY
const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []

const zkSyncTestnet =
  process.env.NODE_ENV == 'test'
    ? {
        url: 'http://localhost:3050',
        ethNetwork: 'http://localhost:8545',
        chainId: 270,
        zksync: true,
        allowUnlimitedContractSize: true,
      }
    : {
        url: 'https://zksync2-testnet.zksync.dev',
        ethNetwork: 'goerli',
        zksync: true,
        allowUnlimitedContractSize: true,
        chainId: 280,
        verifyURL: 'https://zksync2-testnet-explorer.zksync.dev/contract_verification',
      }

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    artifacts: 'build/artifacts',
    cache: 'build/cache',
    deploy: 'deploy',
    sources: 'contracts',
    deployments: 'deployments',
  },
  defaultNetwork: 'zkSyncTestnet',
  networks: {
    hardhat: {
      zksync: true,
    },
    mainnet: {
      live: true,
      saveDeployments: true,
      url: `https://mainnet.infura.io/v3/${infuraKey}`,
      accounts,
      zksync: false,
    },
    gnosis: {
      live: true,
      saveDeployments: true,
      url: 'https://rpc.gnosischain.com/',
      accounts,
      zksync: false,
    },
    rinkeby: {
      live: false,
      saveDeployments: true,
      url: `https://rinkeby.infura.io/v3/${infuraKey}`,
      accounts,
      zksync: false,
    },
    zkSyncTestnet,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  namedAccounts: {
    deployer: 0,
    account1: 1,
    account2: 2,
  },
  gasReporter: {
    currency: 'USD',
    enabled: process.env.GAS_REPORT_ENABLED === 'true',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_KEY,
  },
  dependencyCompiler: {
    paths: ['./contracts/test'],
  },
  zksolc: {
    version: '1.3.5',
    compilerSource: 'binary',

    settings: {},
  },
}
export default config
