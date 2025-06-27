# Allies_jobPortal

# Decentralized JobBoard with Escrow

A fully on-chain, trustless job board platform where clients can post jobs, freelancers can apply, and payments are managed via smart contract-based escrow.  
Developed as part of *CS 218: Programmable and Interoperable Blockchains*.

<div align="center">

### Team: SmartContractors
| Name         | Roll No |
|--------------|---------|
| Rachakonda Chandrahasa | 230001065 |
| Rahul Kumar | 230001066 |
| Darpan Nayak Tejavath | 230001022 |
| Gajendra Singh Rana | 230004016 |
| Thikmanik Nongrang | 230001077 |
| Sai Abhilash Dash | 230005041 |
| Mannuru Praneetha | 230005025 |

</div>

---

## Features

- Clients can post jobs with title, description, pay amount, and deadline
- Freelancers can browse available jobs and apply
- Clients can accept applicants and deposit funds into escrow
- Payments are released by the client upon completion, or refunded after deadline expiration
- Ratings and reviews after job completion influence freelancer reputation
- Gas-efficient design using structs, mappings, and minimal state updates

---

## Technologies Used

- Solidity (v0.8.20) for smart contract
- Truffle for compilation, deployment, and testing
- Ganache for local blockchain simulation
- React.js + Tailwind CSS for frontend
- MetaMask for wallet integration

---

## Setup Instructions

### Requirements
- Node.js (v18+), npm (v10+)
- Truffle, Ganache (CLI or GUI)
- MetaMask extension

---
## Instructions for setup (Windows)

`Node v18.20.8`, `npm 10.8.2`, the Ganache application for Windows, and the MetaMask browser extension are required. Once you've verified the installation and usage of said versions, follow the next instructions
### 1. Clone the repository and install dependencies
It is highly recommended that you clone into a path without any spaces in it.
``` bash
git clone https://github.com/Chandrahasa06/Allies_jobPortal
cd Allies_jobPortal
npm install
```
### 2. Set up a new workspace in Ganache
![image](https://github.com/user-attachments/assets/47c1b4ba-2682-4c2a-80a8-b4e58cc73221)

### 3. Connect Metamask to Ganache

Copy the mnemonic that shows up here to your clipboard
![Screenshot 2025-06-27 171124](https://github.com/user-attachments/assets/dbf54cef-e814-47cd-80ef-8ef57615c619)
Open metamask and click on import existing wallet, enter the password and make an account.
Open and log into your MetaMask account, and select the dropdown that allows you to change the network
Here, select Add a custom network
<div align="center">
  ![Screenshot 2025-06-27 171203](https://github.com/user-attachments/assets/60123c72-b4f1-493e-9701-47e67ac9af1d)

</div>
Save with the following fields
<div align="center">
  ![Screenshot 2025-06-27 171557](https://github.com/user-attachments/assets/abbabe08-66a9-486b-abd7-7c9346ec2ce0)

</div>
Switch to the newly created testnet, and then select the highlighted dropdown.
<div align="center">
   ![Screenshot 2025-06-27 171630](https://github.com/user-attachments/assets/7657303f-12f4-4dd6-9741-987862e8763c)


</div>
Select Add account or hardware wallet, paste the address copied earlier, and select import.
<div align="center">
   ![Screenshot 2025-06-27 171754](https://github.com/user-attachments/assets/1039077e-7c6c-4c01-abac-b77068a1bc01)
   ![Screenshot 2025-06-27 171804](https://github.com/user-attachments/assets/7c55252a-578e-4d35-8424-023d892e54ad)



</div>
Your interface should now look like this
![Screenshot 2025-06-27 171647](https://github.com/user-attachments/assets/29d14fe9-c029-4f82-9b16-3e33be295269)


### 4. Compile the contracts and run the application
Open a terminal in the root directory of the project, and run
``` bash
truffle compile
truffle migrate --reset
npm start
```

Now connect your account by opening MetaMask(make sure you're on the right test network!).
<div align="center">
   ![Screenshot 2025-06-27 171816](https://github.com/user-attachments/assets/a84f2de4-db65-40ec-ae5a-1cf7a66063f5)

</div>
The connection, followed by a refresh, completes the setup.

## Usage

### Employer Workflow

1. Switch to "Employer" mode
2. Create a new job (title, description, price)
3. View applicants and accept the best fit
4. Deposit funds to escrow
5. Release funds when satisfied
6. Rate the freelancer after job completion

### Freelancer Workflow

1. Switch to "Freelancer" mode
2. Browse available jobs and apply
3. Track accepted applications in dashboard
4. Submit work and await release
5. Receive rating and payment upon employer approval

## Testing
Run the following in a terminal opened in the root directory to run the tests(after terminating the website instance, in a new terminal if necessary).
``` bash
truffle test
```
<div align="center">


</div>

## Gas Optimization Highlights

- Used uint8 for ratings, uint256 for core timestamps and prices
- Indexed events for lightweight log retrieval
- Minimized state writes in job update and review functions
- Avoided arrays for tracking applicants — used mapping(address => bool) to reduce gas per job

---

## Future Enhancements

- IPFS integration for resume and work proof storage
- Dispute resolution via decentralized arbitration
- DAO-based platform governance for moderation and curation
  
