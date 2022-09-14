const os = require('os');
const path = require('path');
const uint8ArrayToString = require('uint8arrays/to-string').toString;

async function main()
{
  const { createEd25519PeerId } = await import('@libp2p/peer-id-factory');
  const { PreSharedKeyConnectionProtector } = await import('libp2p/pnet');
  const createIpfs = (await import('ipfs')).create;

  const myPeerId = await createEd25519PeerId();
  console.log('my peerId:',myPeerId.toString());

  const swarmKey = 'L2tleS9zd2FybS9wc2svMS4wLjAvCi9iYXNlMTYvCjZkMDBmNjA3MDc2ZTE3NTM0NzZhMDk3MWQ3NDAzNmViZDU5YTI4NDQ4YjNkZGFmOTAwZTYzYjJhZDc4MjgzOGI';

  const p2pOptions = {
    peerId: myPeerId,
    connectionProtector: new PreSharedKeyConnectionProtector({
      psk: new Uint8Array(Buffer.from(swarmKey, 'base64')),
    }),
  };

  ipfs = await createIpfs({
    libp2p: p2pOptions,
    repo: path.join(os.homedir(), '.testipfs'),
    config: {
      Bootstrap: [],
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

  await ipfs.pubsub.subscribe('mypubsub', (msg) => {
    console.log('got message : ', msg.from.toString(), uint8ArrayToString(msg.data));
  });

  let tosend = 0;
  setInterval(async () => {
    const peers = await ipfs.pubsub.peers('mypubsub');
    console.log('pubsub peers : %o', peers);

    const msg = new TextEncoder().encode(tosend++);
    await ipfs.pubsub.publish('mypubsub', msg);
  },5000);

  console.log(await ipfs.bootstrap.list());
}

main();

