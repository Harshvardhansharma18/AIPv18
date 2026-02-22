# Agent Identity Protocol - Services Guide

Complete guide for running the Indexer and Resolver services for the Agent Identity Protocol.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Development Setup](#development-setup)
6. [Production Deployment](#production-deployment)
7. [API Reference](#api-reference)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

## Overview

The Agent Identity Protocol consists of two core services:

### Indexer Service
- Listens to blockchain events in real-time
- Indexes events into PostgreSQL database
- Maintains synchronization state per chain
- Handles 5 smart contracts (DID, Schema, Attestation, Delegation, Revocation registries)
- Automatic retry and error recovery

### Resolver Service
- REST API for querying indexed identity data
- Computes multi-factor reputation scores
- Generates Merkle proofs for scores
- Performs risk assessment
- Caches results for performance

## Architecture

```
┌─────────────┐
│  Blockchain │
└────────┬────┘
         │
         │ Event Polling (every 12s)
         │
    ┌────▼─────────────┐
    │  Indexer Service │
    │  (Node.js/Viem)  │
    └────┬─────────────┘
         │ Upsert Events
         │
    ┌────▼──────────────┐
    │   PostgreSQL DB   │
    └────┬──────────────┘
         │
    ┌────▼─────────────┐
    │ Resolver Service │
    │  (Fastify API)   │
    └─────────────────┘
         │
         └─► Clients (DApps, SDKs)
```

## Prerequisites

### System Requirements
- Node.js 20+ (LTS)
- PostgreSQL 14+
- 2GB RAM (indexer + resolver)
- Stable internet connection (for RPC access)

### Smart Contracts
You need deployed instances of:
- DID Registry
- Schema Registry
- Attestation Registry
- Delegation Registry
- Revocation Registry

### RPC Endpoint
- Public: Alchemy, Infura, QuickNode
- Private: Local Geth/Hardhat node

## Quick Start

### Using Docker Compose (Recommended)

1. **Create environment file**
```bash
cat > .env.local << 'EOF'
RPC_URL=http://localhost:8545
CHAIN_ID=1
CONTRACT_ADDRESSES='{"DID_REGISTRY":"0x...","SCHEMA_REGISTRY":"0x...","ATTESTATION_REGISTRY":"0x...","DELEGATION_REGISTRY":"0x...","REVOCATION_REGISTRY":"0x..."}'
START_BLOCK=0
POLL_INTERVAL_MS=12000
CORS_ORIGIN=*
