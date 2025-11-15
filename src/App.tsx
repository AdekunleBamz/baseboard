import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface WalletStats {
  address: string;
  txCount: number;
  balance: string;
  firstTx: string;
  lastTx: string;
  basename: string | null;
  tokenHoldings: number;
}

// Helper function to add timeout to fetch requests
function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]) as Promise<Response>;
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
      const ETHERSCAN_API_KEY = import.meta.env.VITE_BASESCAN_API_KEY;
      const BASE_CHAIN_ID = 8453;
      
      // Get balance from Base RPC
      const balanceResponse = await fetchWithTimeout(BASE_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [walletAddress, 'latest'],
          id: 1
        })
      }, 10000);
      const balanceData = await balanceResponse.json();
      const balanceWei = BigInt(balanceData.result || '0');
      const balanceEth = (Number(balanceWei) / 1e18).toFixed(4);
      
      // Get transaction history using Etherscan API V2 (if API key available)
      let txCount = 0;
      let firstTx = 'No transactions found';
      let lastTx = 'No transactions found';
      
      if (ETHERSCAN_API_KEY && ETHERSCAN_API_KEY !== 'YourApiKeyToken') {
        try {
          // Fetch transaction list from Etherscan V2
          const txResponse = await fetchWithTimeout(
            `https://api.etherscan.io/v2/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=10000&sort=asc&chainid=${BASE_CHAIN_ID}&apikey=${ETHERSCAN_API_KEY}`,
            {},
            10000
          );
          const txData = await txResponse.json();
          
          if (txData.status === '1' && txData.result && txData.result.length > 0) {
            const txs = txData.result;
            txCount = txs.length;
            
            // First transaction
            if (txs[0] && txs[0].timeStamp) {
              firstTx = new Date(Number(txs[0].timeStamp) * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
            
            // Last transaction
            const lastTransaction = txs[txs.length - 1];
            if (lastTransaction && lastTransaction.timeStamp) {
              lastTx = new Date(Number(lastTransaction.timeStamp) * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }
        } catch (txErr) {
          console.log('Transaction fetch error:', txErr);
          // Fallback to RPC transaction count
          const txCountResponse = await fetchWithTimeout(BASE_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getTransactionCount',
              params: [walletAddress, 'latest'],
              id: 2
            })
          }, 10000);
          const txCountData = await txCountResponse.json();
          txCount = parseInt(txCountData.result || '0x0', 16);
        }
      } else {
        // Fallback: Get transaction count from RPC only
        const txCountResponse = await fetchWithTimeout(BASE_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionCount',
            params: [walletAddress, 'latest'],
            id: 2
          })
        }, 10000);
        const txCountData = await txCountResponse.json();
        txCount = parseInt(txCountData.result || '0x0', 16);
      }
      
      // Get Basename using Base name resolver (with timeout and parallel attempts)
      let basename: string | null = null;
      try {
        // Try multiple Base name resolver endpoints in parallel with timeout
        const basenamePromises = [
          fetchWithTimeout(`https://resolver-api.basename.app/v1/names?addresses=${walletAddress.toLowerCase()}`, {}, 5000)
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object') {
                  if (data[walletAddress.toLowerCase()]) {
                    return data[walletAddress.toLowerCase()];
                  } else if (Array.isArray(data) && data.length > 0) {
                    return data[0]?.name || data[0];
                  }
                }
              }
              return null;
            })
            .catch(() => null),
          fetchWithTimeout(`https://api.basename.app/v1/names/${walletAddress.toLowerCase()}`, {}, 5000)
            .then(async (res) => {
              if (res.ok) {
                const data = await res.json();
                if (data && data.name) return data.name;
                if (data && typeof data === 'string') return data;
              }
              return null;
            })
            .catch(() => null)
        ];

        // Wait for first successful response or all to fail
        const results = await Promise.allSettled(basenamePromises);
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            basename = result.value;
            break;
          }
        }
      } catch (nameErr) {
        console.log('Basename lookup error:', nameErr);
        // Basename is optional, so just continue
      }
      
      // Get Token holdings (includes NFTs and other tokens) using Basescan API
      let tokenHoldings = 0;
      if (ETHERSCAN_API_KEY && ETHERSCAN_API_KEY !== 'YourApiKeyToken') {
        try {
          // Try Basescan API first with timeout
          try {
            const tokenResponse = await fetchWithTimeout(
              `https://api.basescan.org/api?module=account&action=addresstokenbalance&address=${walletAddress}&page=1&offset=10000&apikey=${ETHERSCAN_API_KEY}`,
              {},
              10000
            );
            const tokenData = await tokenResponse.json();
            
            if (tokenData.status === '1' && tokenData.result && Array.isArray(tokenData.result)) {
              // Count unique token contracts (including NFTs and ERC-20 tokens)
              const uniqueTokens = new Set(tokenData.result.map((token: any) => token.contractAddress));
              tokenHoldings = uniqueTokens.size;
            }
          } catch (e) {
            // Fallback to Etherscan V2 API with chainid
            try {
              const tokenResponse2 = await fetchWithTimeout(
                `https://api.etherscan.io/v2/api?module=account&action=tokenlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=10000&sort=desc&chainid=${BASE_CHAIN_ID}&apikey=${ETHERSCAN_API_KEY}`,
                {},
                10000
              );
              const tokenData2 = await tokenResponse2.json();
              
              if (tokenData2.status === '1' && tokenData2.result && Array.isArray(tokenData2.result)) {
                const uniqueTokens = new Set(tokenData2.result.map((token: any) => token.contractAddress));
                tokenHoldings = uniqueTokens.size;
              }
            } catch (e2) {
              console.log('Token holdings fetch error:', e2);
            }
          }
        } catch (tokenErr) {
          console.log('Token holdings fetch error:', tokenErr);
        }
      }

      setStats({
        address: walletAddress,
        txCount: txCount,
        balance: `${balanceEth} ETH`,
        firstTx,
        lastTx,
        basename,
        tokenHoldings
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
      <div style={{ position: 'relative', zIndex: 1, padding: '16px 20px' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0052FF 0%, #8A2BE2 100%)',
              padding: '6px',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(0, 82, 255, 0.3)'
            }}>
              <img src="/icon.png" alt="BaseBoard" style={{ height: '28px', width: '28px', borderRadius: '6px', display: 'block' }} />
            </div>
            <h1 style={{ 
              fontSize: '24px', 
              margin: 0, 
              fontWeight: '800',
              background: 'linear-gradient(135deg, #0052FF 0%, #8A2BE2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              BaseBoard
            </h1>
          </div>
          <ConnectMenu />
        </header>
        
        <main>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)',
              padding: '28px',
              borderRadius: '20px',
              boxShadow: '0 8px 32px rgba(0, 82, 255, 0.12)',
              border: '2px solid rgba(0, 82, 255, 0.1)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ 
                  fontSize: '22px', 
                  marginBottom: '8px', 
                  background: 'linear-gradient(135deg, #0052FF 0%, #8A2BE2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: '700'
                }}>
                  Base Wallet Analytics
                </h2>
                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  Analyze wallet activity on Base chain
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x... or ENS name"
                  style={{ 
                    flexGrow: 1, 
                    minWidth: '200px',
                    padding: '12px 16px', 
                    fontSize: '15px', 
                    border: '2px solid rgba(0, 82, 255, 0.2)', 
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 8px rgba(0, 82, 255, 0.05)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0052FF';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(0, 82, 255, 0.2)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 82, 255, 0.05)';
                  }}
                />
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  style={{ 
                    padding: '12px 24px', 
                    fontSize: '15px', 
                    fontWeight: '700',
                    cursor: analyzing ? 'not-allowed' : 'pointer', 
                    background: analyzing 
                      ? 'linear-gradient(135deg, #ccc 0%, #aaa 100%)' 
                      : 'linear-gradient(135deg, #0052FF 0%, #8A2BE2 100%)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    boxShadow: analyzing 
                      ? 'none' 
                      : '0 4px 16px rgba(0, 82, 255, 0.4)',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (!analyzing) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 82, 255, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!analyzing) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 82, 255, 0.4)';
                    }
                  }}
                >
                  {analyzing ? (
                    <>
                      <span>⏳</span> Analyzing...
                    </>
                  ) : (
                    <>
                      <span>🔍</span> Analyze
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              {stats && (
                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.08) 0%, rgba(138, 43, 226, 0.08) 100%)',
                  borderRadius: '16px',
                  border: '2px solid rgba(0, 82, 255, 0.2)',
                  boxShadow: '0 4px 20px rgba(0, 82, 255, 0.15)'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#0052FF', fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '20px' }}>📊</span> Wallet Analysis
                    </h3>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      padding: '14px',
                      background: 'linear-gradient(135deg, #0052FF 0%, #0041CC 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(0, 82, 255, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '6px', fontWeight: '500' }}>Balance</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: '1.2' }}>{stats.balance}</div>
                    </div>
                    <div style={{
                      padding: '14px',
                      background: 'linear-gradient(135deg, #8A2BE2 0%, #6A1BB2 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(138, 43, 226, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '6px', fontWeight: '500' }}>Transactions</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: '1.2' }}>{stats.txCount.toLocaleString()}</div>
                    </div>
                    <div style={{
                      padding: '14px',
                      background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%)',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '6px', fontWeight: '500' }}>Token Holdings</div>
                      <div style={{ fontSize: '22px', fontWeight: 'bold', lineHeight: '1.2' }}>{stats.tokenHoldings}</div>
                    </div>
                  </div>

                  {/* Base Name Display */}
                  <div style={{
                    marginBottom: '12px',
                    padding: '10px 14px',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '10px',
                    border: '1px solid rgba(0, 82, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: '600' }}>Base Name</div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: stats.basename ? '#0052FF' : '#999',
                        fontWeight: '500'
                      }}>
                        {stats.basename || 'No Base name'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <a
                        href="https://base.org/name"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, #0052FF 0%, #8A2BE2 100%)',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: 'white',
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(0, 82, 255, 0.3)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 82, 255, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 82, 255, 0.3)';
                        }}
                      >
                        Register Name
                      </a>
                      <a
                        href={`https://basescan.org/address/${stats.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: 'white',
                          textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                          display: 'inline-block'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 10px rgba(99, 102, 241, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(99, 102, 241, 0.3)';
                        }}
                      >
                        Basescan
                      </a>
                    </div>
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '10px',
                    marginBottom: '12px',
                    border: '1px solid rgba(0, 82, 255, 0.1)'
                  }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px', fontWeight: '600' }}>Address</div>
                    <div style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '12px', 
                      color: '#333',
                      wordBreak: 'break-all',
                      lineHeight: '1.4'
                    }}>
                      {stats.address}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '12px'
                  }}>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: '10px',
                      border: '1px solid rgba(0, 82, 255, 0.15)'
                    }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: '600' }}>First Transaction</div>
                      <div style={{ fontSize: '13px', color: '#333', fontWeight: '500' }}>{stats.firstTx}</div>
                    </div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: '10px',
                      border: '1px solid rgba(0, 82, 255, 0.15)'
                    }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: '600' }}>Last Transaction</div>
                      <div style={{ fontSize: '13px', color: '#333', fontWeight: '500' }}>{stats.lastTx}</div>
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
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.1) 0%, rgba(138, 43, 226, 0.1) 100%)',
          padding: '8px 14px',
          borderRadius: '10px',
          border: '2px solid rgba(0, 82, 255, 0.3)',
          fontSize: '13px',
          fontWeight: '600',
          color: '#0052FF',
          boxShadow: '0 2px 8px rgba(0, 82, 255, 0.15)',
          fontFamily: 'monospace'
        }}>
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <button
          type="button"
          onClick={() => disconnect()}
          style={{
            background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            color: 'white',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.3)';
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
        background: 'linear-gradient(135deg, #0052FF 0%, #8A2BE2 100%)',
        padding: '8px 16px',
        borderRadius: '10px',
        border: 'none',
        fontSize: '13px',
        fontWeight: '700',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 2px 8px rgba(0, 82, 255, 0.3)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 82, 255, 0.3)';
      }}
    >
      Connect Wallet
    </button>
  );
}

export default App;
