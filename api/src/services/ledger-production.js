/**
 * PRODUCTION LEDGER SERVICE
 * Real Hyperledger Fabric Gateway using gRPC over mTLS.
 * This file is used when USE_REAL_FABRIC=true and a real Fabric test network is running.
 */
const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const grpc = require('@grpc/grpc-js');

const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'MadhuPraman';
const mspId = process.env.MSP_ID || 'BeekeeperOrgMSP';

const cryptoPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'beekeeper.example.com');

async function newGrpcConnection() {
  const tlsRootCertPath = path.resolve(cryptoPath, 'peers', 'peer0.beekeeper.example.com', 'tls', 'ca.crt');
  const tlsRootCert = await fs.readFile(tlsRootCertPath);
  const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
  return new grpc.Client('localhost:7051', tlsCredentials, {
    'grpc.ssl_target_name_override': 'peer0.beekeeper.example.com',
  });
}

async function newIdentity() {
  const certPath = path.resolve(cryptoPath, 'users', 'User1@beekeeper.example.com', 'msp', 'signcerts', 'cert.pem');
  const credentials = await fs.readFile(certPath);
  return { mspId, credentials };
}

async function newSigner() {
  const keyPath = path.resolve(cryptoPath, 'users', 'User1@beekeeper.example.com', 'msp', 'keystore');
  const files = await fs.readdir(keyPath);
  const keyPathFile = path.resolve(keyPath, files[0]);
  const privateKeyPem = await fs.readFile(keyPathFile);
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  return signers.newPrivateKeySigner(privateKey);
}

module.exports = {
  async writeEvent({ batchId, eventType, actorId, parentBatchIds, metadataHash }) {
    const client = await newGrpcConnection();
    const gateway = connect({
      client,
      identity: await newIdentity(),
      signer: await newSigner(),
    });
    try {
      const network = gateway.getNetwork(channelName);
      const contract = network.getContract(chaincodeName);
      console.log(`[FABRIC-PROD] Submitting CreateBatchEvent for ${batchId}...`);
      const commit = await contract.submitTransaction(
        'CreateBatchEvent',
        batchId, eventType, actorId,
        JSON.stringify(parentBatchIds || []),
        metadataHash,
        new Date().toISOString()
      );
      console.log(`[FABRIC-PROD] Transaction committed.`);
      return JSON.parse(new TextDecoder().decode(commit));
    } finally {
      gateway.close();
      client.close();
    }
  }
};
