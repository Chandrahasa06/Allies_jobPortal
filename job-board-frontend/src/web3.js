// src/web3.js
import { ethers } from 'ethers'; // Import ethers directly
import JobBoardABI from './contract/JobBoard.json';

// Contract address
const CONTRACT_ADDRESS = "0x6abEc71Fc4C13e51E1d6517F373acd08271c1917";

// Initialize Web3 provider (MetaMask)
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Create Contract instance
const jobBoardContract = new ethers.Contract(CONTRACT_ADDRESS, JobBoardABI.abi, signer);

export { provider, signer, jobBoardContract };
