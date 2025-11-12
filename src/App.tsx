import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface WalletStats {
  address: string;
  txCount: number;
  balance: string;
  firstActivity: string;
  lastActivity: string;
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
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        throw new Error('Invalid Ethereum address format');
      }

      // Fetch wallet data from Base chain
      const response = await fetch(`https://api.basescan.org/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=YourApiKeyToken`);
      const data = await response.json();
      
      if (data.status === '1' && data.result && data.result.length > 0) {
        const txs = data.result;
        const firstTx = txs[0];
        const lastTx = txs[txs.length - 1];
        
        setStats({
          address: walletAddress,
          txCount: txs.length,
          balance: 'Fetching...',
          firstActivity: new Date(Number(firstTx.timeStamp) * 1000).toLocaleDateString(),
          lastActivity: new Date(Number(lastTx.timeStamp) * 1000).toLocaleDateString()
        });
      } else {
        // No transactions found or API error - show basic info
        setStats({
          address: walletAddress,
          txCount: 0,
          balance: 'N/A',
          firstActivity: 'No activity',
          lastActivity: 'No activity'
        });
      }
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
                  <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#181818' }}>
                    Wallet Analysis
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div>
                      <strong style={{ color: '#666' }}>Address:</strong>
                      <div style={{ fontFamily: 'monospace', fontSize: '14px', marginTop: '4px' }}>
                        {stats.address}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: '#666' }}>Total Transactions:</strong>
                      <div style={{ fontSize: '18px', color: '#0052FF', marginTop: '4px' }}>
                        {stats.txCount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <strong style={{ color: '#666' }}>First Activity:</strong>
                      <div style={{ marginTop: '4px' }}>{stats.firstActivity}</div>
                    </div>
                    <div>
                      <strong style={{ color: '#666' }}>Last Activity:</strong>
                      <div style={{ marginTop: '4px' }}>{stats.lastActivity}</div>
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
