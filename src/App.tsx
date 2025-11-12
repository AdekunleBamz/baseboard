import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface WalletStats {
  address: string;
  txCount: number;
  balance: string;
  firstTx: string;
  lastTx: string;
  basename: string | null;
  nftCount: number;
}

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [error, setError] = useState<string>('');
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
    }
  }, [address, isConnected]);

  const handleAnalyze = async () => {
    if (!walletAddress) {
      setError('Please enter a wallet address.');
      return;
    }
    
    setAnalyzing(true);
    setError('');
    setStats(null);
    
    try {
      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress.toLowerCase())) {
        throw new Error('Invalid Ethereum address format');
      }

      const BASE_RPC = 'https://mainnet.base.org';
      
      // Get balance
      const balanceResponse = await fetch(BASE_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [walletAddress, 'latest'],
          id: 1
        })
      });
      const balanceData = await balanceResponse.json();
      const balanceWei = BigInt(balanceData.result || '0');
      const balanceEth = (Number(balanceWei) / 1e18).toFixed(4);
      
      // Get transaction count
      const txCountResponse = await fetch(BASE_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionCount',
          params: [walletAddress, 'latest'],
          id: 2
        })
      });
      const txCountData = await txCountResponse.json();
      const txCount = parseInt(txCountData.result || '0x0', 16);
      
      // Fetch transaction history from BaseScan (free, no API key needed for basic queries)
      let firstTx = 'Unknown';
      let lastTx = 'Unknown';
      
      try {
        const basescanResponse = await fetch(
          `https://api.basescan.org/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc`
        );
        const basescanData = await basescanResponse.json();
        
        if (basescanData.status === '1' && basescanData.result && basescanData.result.length > 0) {
          const txs = basescanData.result;
          firstTx = new Date(Number(txs[0].timeStamp) * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Get last tx with another query
          const lastTxResponse = await fetch(
            `https://api.basescan.org/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=1&sort=desc`
          );
          const lastTxData = await lastTxResponse.json();
          if (lastTxData.status === '1' && lastTxData.result && lastTxData.result.length > 0) {
            lastTx = new Date(Number(lastTxData.result[0].timeStamp) * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }
      } catch (txErr) {
        console.error('Transaction history fetch error:', txErr);
      }
      
      // Try to get Basename (using Base's name registry contract)
      let basename: string | null = null;
      try {
        // Base Name Registry contract address
        const nameRegistryResponse = await fetch(BASE_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: '0x4ccb0bb02fcaba27e82a56646e81d8c5bc4119a5', // Base Name Resolver
              data: `0x691f3431${walletAddress.slice(2).padStart(64, '0')}` // reverseNameOf
            }, 'latest'],
            id: 3
          })
        });
        const nameData = await nameRegistryResponse.json();
        if (nameData.result && nameData.result !== '0x') {
          // Parse the name from hex
          const hexString = nameData.result.slice(2);
          if (hexString.length > 128) {
            const nameBytes = hexString.slice(128);
            let name = '';
            for (let i = 0; i < nameBytes.length; i += 2) {
              const byte = parseInt(nameBytes.substr(i, 2), 16);
              if (byte !== 0) name += String.fromCharCode(byte);
            }
            if (name.length > 0) basename = name;
          }
        }
      } catch (nameErr) {
        console.error('Basename fetch error:', nameErr);
      }
      
      // Get NFT count (using simple estimation via contract call traces)
      let nftCount = 0;
      try {
        // Query for ERC721 Transfer events to this address
        const nftResponse = await fetch(
          `https://api.basescan.org/api?module=account&action=tokennfttx&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc`
        );
        const nftData = await nftResponse.json();
        if (nftData.status === '1' && nftData.result) {
          // Count unique token contracts
          const uniqueContracts = new Set(nftData.result.map((tx: any) => tx.contractAddress));
          nftCount = uniqueContracts.size;
        }
      } catch (nftErr) {
        console.error('NFT fetch error:', nftErr);
      }

      setStats({
        address: walletAddress,
        txCount: txCount,
        balance: `${balanceEth} ETH`,
        firstTx,
        lastTx,
        basename,
        nftCount
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet data. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundImage: 'url(/image.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    }}>
      {/* Overlay for better text readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(8px)'
      }} />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/icon.png" alt="BaseBoard" style={{ height: '32px', width: '32px', borderRadius: '8px', marginRight: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
            <h1 style={{ fontSize: '28px', margin: 0, fontWeight: 'bold', color: '#181818' }}>BaseBoard</h1>
          </div>
          <ConnectMenu />
        </header>
        
        <main>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '40px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.5)'
            }}>
              <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#181818' }}>
                Base Wallet Analytics
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
                Enter a wallet address to analyze its activity on the Base chain.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Enter wallet address or ENS"
                  style={{ 
                    flexGrow: 1, 
                    minWidth: '250px',
                    padding: '14px 18px', 
                    fontSize: '16px', 
                    border: '2px solid #e0e0e0', 
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  style={{ 
                    padding: '14px 32px', 
                    fontSize: '16px', 
                    fontWeight: '600',
                    cursor: analyzing ? 'not-allowed' : 'pointer', 
                    backgroundColor: analyzing ? '#ccc' : '#0052FF', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    boxShadow: analyzing ? 'none' : '0 4px 12px rgba(0, 82, 255, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!analyzing) {
                      e.currentTarget.style.backgroundColor = '#0041CC';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 82, 255, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!analyzing) {
                      e.currentTarget.style.backgroundColor = '#0052FF';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.3)';
                    }
                  }}
                >
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>

              {error && (
                <div style={{
                  marginTop: '20px',
                  padding: '12px',
                  backgroundColor: '#fee',
                  color: '#c33',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}

              {stats && (
                <div style={{
                  marginTop: '30px',
                  padding: '24px',
                  backgroundColor: 'rgba(0, 82, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 82, 255, 0.2)',
                  textAlign: 'left'
                }}>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#181818', fontSize: '20px' }}>
                    Wallet Analysis
                  </h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {stats.basename && (
                      <div style={{
                        padding: '12px',
                        backgroundColor: 'rgba(0, 82, 255, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 82, 255, 0.3)'
                      }}>
                        <strong style={{ color: '#0052FF', fontSize: '16px' }}>🔵 Basename:</strong>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px', color: '#0052FF' }}>
                          {stats.basename}
                        </div>
                      </div>
                    )}
                    <div>
                      <strong style={{ color: '#666' }}>Address:</strong>
                      <div style={{ fontFamily: 'monospace', fontSize: '13px', marginTop: '4px', wordBreak: 'break-all' }}>
                        {stats.address}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{
                        padding: '16px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <strong style={{ color: '#666', fontSize: '14px' }}>Balance</strong>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0052FF', marginTop: '8px' }}>
                          {stats.balance}
                        </div>
                      </div>
                      <div style={{
                        padding: '16px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <strong style={{ color: '#666', fontSize: '14px' }}>Transactions</strong>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0052FF', marginTop: '8px' }}>
                          {stats.txCount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <strong style={{ color: '#666', fontSize: '14px' }}>NFT Collections</strong>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0052FF', marginTop: '8px' }}>
                        {stats.nftCount} {stats.nftCount === 1 ? 'collection' : 'collections'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                      <div>
                        <strong style={{ color: '#666', fontSize: '14px' }}>First Transaction:</strong>
                        <div style={{ marginTop: '6px', fontSize: '14px' }}>{stats.firstTx}</div>
                      </div>
                      <div>
                        <strong style={{ color: '#666', fontSize: '14px' }}>Last Transaction:</strong>
                        <div style={{ marginTop: '6px', fontSize: '14px' }}>{stats.lastTx}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px 16px',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          fontSize: '14px',
          fontWeight: '500',
          color: '#181818',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
        }}>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <button
          type="button"
          onClick={() => disconnect()}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #ff4444',
            fontSize: '14px',
            fontWeight: '600',
            color: '#ff4444',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#ff4444';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            e.currentTarget.style.color = '#ff4444';
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button 
      type="button" 
      onClick={() => connect({ connector: connectors[0] })}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px 20px',
        borderRadius: '8px',
        border: '2px solid #0052FF',
        fontSize: '14px',
        fontWeight: '600',
        color: '#0052FF',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#0052FF';
        e.currentTarget.style.color = 'white';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
        e.currentTarget.style.color = '#0052FF';
      }}
    >
      Connect Wallet
    </button>
  );
}

export default App;
