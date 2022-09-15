const os = require('os');
const path = require('path');
const uint8ArrayToString = require('uint8arrays/to-string').toString;
const uint8ArrayConcat = require('uint8arrays/concat').concat;
const { CID } = require('multiformats/cid');

async function main()
{
  const { createEd25519PeerId } = await import('@libp2p/peer-id-factory');
  const { PreSharedKeyConnectionProtector } = await import('libp2p/pnet');
  const { GossipSub } = await import('@chainsafe/libp2p-gossipsub');
  const createIpfs = (await import('ipfs')).create;

  const myPeerId = await createEd25519PeerId();
  console.log('my peerId:',myPeerId.toString());

  const swarmKey = 'L2tleS9zd2FybS9wc2svMS4wLjAvCi9iYXNlMTYvCjZkMDBmNjA3MDc2ZTE3NTM0NzZhMDk3MWQ3NDAzNmViZDU5YTI4NDQ4YjNkZGFmOTAwZTYzYjJhZDc4MjgzOGI';

  const p2pOptions = {
    peerId: myPeerId,
    pubsub: new GossipSub({
      allowPublishToZeroPeers: true,
      fallbackToFloodsub: true,
      emitSelf: true,
      maxInboundStreams: 64,
      maxOutboundStreams: 128,
    }),
    connectionProtector: new PreSharedKeyConnectionProtector({
      psk: new Uint8Array(Buffer.from(swarmKey, 'base64')),
    }),
  };

  const bootstrap = [];
  // const bootstrap = [
  //   '/ip4/5.51.172.39/tcp/4002/p2p/xxx',
  //   '/ip4/5.51.172.39/tcp/4002/p2p/xxx',
  //   '/ip4/5.51.172.39/tcp/4003/ws/p2p/xxx',
  // ];

  ipfs = await createIpfs({
    libp2p: p2pOptions,
    repo: path.join(os.homedir(), '.ipfs-'+myPeerId.toString()),
    config: {
      Bootstrap: bootstrap,
    },
  });

  const libp2p = ipfs.libp2p;

  libp2p.connectionManager.addEventListener('peer:connect', async (evt) => {
    const { detail: connection } = evt;
    const { remotePeer } = connection;
    console.log( 'peer:connect', remotePeer.toString());
  });

  libp2p.connectionManager.addEventListener('peer:disconnect', async (evt) => {
    const { detail: connection } = evt;
    const { remotePeer } = connection;
    console.log( 'peer:disconnect', remotePeer.toString());
  });

  await ipfs.pubsub.subscribe('mypubsub', async (msg) => {
    console.log('got message : ', msg.from.toString(), uint8ArrayToString(msg.data));

    const cid = CID.parse(uint8ArrayToString(msg.data));
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    const content = uint8ArrayToString(uint8ArrayConcat(chunks));
    console.log('got file : ', content);

  });

  // 2 subscribe => 2 events
  // await ipfs.pubsub.subscribe('mypubsub', (msg) => {
  //   console.log('got message : ', msg.from.toString(), uint8ArrayToString(msg.data));
  // });

  let nfile = 0;
  setInterval(async () => {
    const content = myPeerId.toString()+' ipfs file #' + nfile++;
    const result = await ipfs.add(content);
    console.log('save ipfs : ', result.cid);
    const CID =  result.path;

    const peers = await ipfs.pubsub.peers('mypubsub');
    console.log('pubsub peers : %o', peers.length);

    const msg = new TextEncoder().encode(CID);
    await ipfs.pubsub.publish('mypubsub', msg);
  },10000);

  console.log(await ipfs.bootstrap.list());
}

main();

