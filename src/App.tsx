import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const { address, isConnected } = useAccount();

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
    }
  }, [address, isConnected]);

  const handleAnalyze = () => {
    // Placeholder for analysis logic
    if (!walletAddress) {
      console.log('Please enter a wallet address.');
      return;
    }
    console.log('Analyzing wallet:', walletAddress);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px' }}>BaseBoard</h1>
        <ConnectMenu />
      </header>
      <main style={{ marginTop: '40px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#555' }}>
            Enter a wallet address to analyze its activity on the Base chain.
          </p>
          <div style={{ display: 'flex', marginTop: '20px' }}>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter wallet address or ENS"
              style={{ flexGrow: 1, padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={handleAnalyze}
              style={{ marginLeft: '10px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Analyze
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return (
      <div>
        Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </button>
  );
}

export default App;
