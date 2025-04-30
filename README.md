# Allies_jobPortal

# Decentralized JobBoard with Escrow

A fully on-chain, trustless job board platform where clients can post jobs, freelancers can apply, and payments are managed via smart contract-based escrow.  
Developed as part of *CS 218: Programmable and Interoperable Blockchains*.

<div align="center">

### Team: SmartContractors
| Name         | Roll No |
|--------------|---------|
| Trupti U. Rathod | 230001000 |
| Trupti U. Rathod | 230001000 |
| Trupti U. Rathod | 230001000 |
| Trupti U. Rathod | 230001000 |
| Trupti U. Rathod | 230001000 |
| Trupti U. Rathod | 230001000 |
| Trupti U. Rathod | 230001000 |


---

## 💡 Features

- Clients can post jobs with title, description, pay amount, and deadline
- Freelancers can browse available jobs and apply
- Clients can accept applicants and deposit funds into escrow
- Payments are released by the client upon completion, or refunded after deadline expiration
- Ratings and reviews after job completion influence freelancer reputation
- Gas-efficient design using structs, mappings, and minimal state updates

---

## ⚙️ Technologies Used

- Solidity (v0.8.20) for smart contract
- Truffle for compilation, deployment, and testing
- Ganache for local blockchain simulation
- React.js + Tailwind CSS for frontend
- MetaMask for wallet integration

---

## 🚀 Setup Instructions

### Requirements
- Node.js (v18+), npm (v10+)
- Truffle, Ganache (CLI or GUI)
- MetaMask extension

### 1. Clone & Install

```bash
git clone https://github.com/your-username/Decentralized-JobBoard.git
cd Decentralized-JobBoard
npm install
```

### 2. Ganache Setup

- Open Ganache and add the project by linking the `truffle-config.js` file
- Start the local blockchain with default settings (port `7545`)
- Copy private key of an account and import into MetaMask

### 3. Compile & Migrate Contracts

```bash
truffle compile
truffle migrate --reset
```

### 4. Run Frontend

```bash
npm start
```

---

## 🧑‍💼 Client Workflow

1. Switch to "Client" mode
2. Create a new job (title, description, price, deadline)
3. View applicants and accept the best fit
4. Deposit funds to escrow
5. Release funds when satisfied
6. Optionally rate the freelancer after job completion

## 👨‍💻 Freelancer Workflow

1. Switch to "Freelancer" mode
2. Browse available jobs and apply
3. Track accepted applications in dashboard
4. Submit work and await release
5. Receive rating and payment upon client approval

---

## 🔍 Testing

To run contract-level unit tests:

```bash
truffle test
```

> Tests cover job posting, application, escrow logic, refunds, rating system, and access control.

---

## 🧠 Gas Optimization Highlights

- Used `uint8` for ratings, `uint256` for core timestamps and prices
- Indexed events for lightweight log retrieval
- Minimized state writes in job update and review functions
- Avoided arrays for tracking applicants — used `mapping(address => bool)` to reduce gas per job

---

## 🔮 Future Enhancements

- IPFS integration for resume and work proof storage
- Dispute resolution via decentralized arbitration
- DAO-based platform governance for moderation and curation

```
