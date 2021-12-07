import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {GaugeRewardsDistributor, HIIQGaugeController} from "../typechain";
import {ethers} from "hardhat";

const hiiqGaugeControllerContractName = 'HIIQGaugeController';
const gaugeRewardsDistributorContractName = 'GaugeRewardsDistributor';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // FRAX not on rinkeby? deploy the Simple Gauge instead
  const contractName = hre.network.name == 'rinkeby' ? 'SimpleGauge' : 'StakingRewardsMultiGauge';
  // const contractName = 'StakingRewardsMultiGauge';
  const {deployments, getNamedAccounts} = hre;
  const {deployer, iqFraxLpToken} = await getNamedAccounts();
  const {deploy} = deployments;
  const iQ = await deployments.get('IQERC20');
  const hiiqGaugeController = <HIIQGaugeController>await ethers.getContract(hiiqGaugeControllerContractName, deployer)
  const gaugeRewardsDistributor = <GaugeRewardsDistributor>await ethers.getContract(gaugeRewardsDistributorContractName, deployer)

  hre.deployments.log('hiiqGaugeController', hiiqGaugeController.address);
  hre.deployments.log('gaugeRewardsDistributor', gaugeRewardsDistributor.address);

  const result = await deploy(contractName, {
    from: deployer,
    args: [
      iqFraxLpToken,
      gaugeRewardsDistributor.address,
      ['IQ'],
      [iQ.address],
      [deployer],
      [11574074074074],
      [hiiqGaugeController.address],
    ],
    log: true,
  });

  hre.deployments.log(
    `🚀 contract IQ FRAX Gauge deployed at ${result.address} using ${result.receipt?.gasUsed} gas`
  );

  let baseNonce = hre.ethers.provider.getTransactionCount(deployer);
  let nonceOffset = 0;

  function getNonce() {
    return baseNonce.then((nonce) => (nonce + (nonceOffset++)));
  }

  // let estGas;

  // add the gauge to the gauge controller
  // estGas = await hiiqGaugeController.estimateGas.add_gauge(result.address, 0, 5000);
  await hiiqGaugeController.add_gauge(result.address, 0, 5000, {gasLimit: 250000, nonce: getNonce()});

  // set the gauge active for the rewards distributor
  // estGas = await gaugeRewardsDistributor.estimateGas.setGaugeState(result.address, false, true);
  await gaugeRewardsDistributor.setGaugeState(result.address, false, true, {gasLimit: 250000, nonce: getNonce()});
};

export default func;
func.tags = ['IQ/FRAX Gauge'];
func.dependencies = ['IQERC20', hiiqGaugeControllerContractName, gaugeRewardsDistributorContractName];
