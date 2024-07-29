import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESS } from './constants'
import { abi } from './assets/abis/erc1155'
import { useState } from 'react'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { config } from './main'
import { toast } from 'react-toastify'
import { isAddress } from 'viem/utils'; 
import truncateEthAddress from 'truncate-eth-address';


function App(): JSX.Element {
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const [destinyAddress, setDestinyAddress] = useState("");
  const [amount, setAmount] = useState(1);
  const safeAddress = address?? 'Please, connect your wallet'; // Se utiliza este string como placeholder

  const { data, isLoading, refetch } = useReadContract({
    abi,
    address: CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: [address, 1],
  })

  const { writeContractAsync } = useWriteContract()

  const handleMint = async () => {
    console.log("SaveAdress", safeAddress);
    console.log("Adress", address);
    setIsMinting(true)
    try {
      const txHash = await writeContractAsync({
        abi,
        address: CONTRACT_ADDRESS,
        functionName: 'mint',
        args: [safeAddress, 1, 1],
      })

      await waitForTransactionReceipt(config, {
        confirmations: 1,
        hash: txHash,
      })

      setIsMinting(false)
      toast('Minted successfully')

      refetch()
    } catch (error) {
      toast.error('Error while minting. Try again.')
      setIsMinting(false)
      console.error(error)
    }
  }
  const handleTransfer = async () => {
    if (!isAddress(destinyAddress)) {
      throw new Error('Invalid recipient address');
    }
    setIsMinting(true)
    try {
      console.log("DatosTransfer", CONTRACT_ADDRESS, address, destinyAddress,  BigInt("1"), BigInt(amount.toString()));
      const txHashSetApproval = await writeContractAsync({
        abi,
        address: CONTRACT_ADDRESS,
        functionName: 'setApprovalForAll',
        args: [CONTRACT_ADDRESS, true],
      })
      await waitForTransactionReceipt(config, {
        confirmations: 1,
        hash: txHashSetApproval,
      });

      const txHash = await writeContractAsync({
        abi,
        address: CONTRACT_ADDRESS,
        functionName: 'safeTransferFrom',
        args: [address, destinyAddress,  BigInt("1"), BigInt(amount.toString()),"0x"],
      })

      await waitForTransactionReceipt(config, {
        confirmations: 1,
        hash: txHash,
      })

      setIsMinting(false)
      toast('Transferred successfully')

      refetch()
      } catch (error: any) {
    if (error.message.includes('Invalid sender address')) {
      toast.error('Sender address is invalid. Please check and try again.');
    } else if (error.message.includes('Invalid recipient address')) {
      toast.error('Recipient address is invalid. Please check and try again.');
    } else {
      toast.error('Error while transferring. Try again.');
    }
    setIsMinting(false);
    console.error(error);
  }
  }

return (
  <main className="flex min-h-screen flex-col items-center justify-center w-full  my-24">
    <section className="space-y-5">
      <h1 className="text-4xl font-bold text-center mt-24">
        🚀 Publica un Business Card verificada 🚀
      </h1>
      <h2 className="text-2xl font-semibold text-center my-36">
         accesible desde cualquier lugar en internet
      </h2>
      <div className="bg-gray-500 w-140 h-120 m-auto m-b-96 flex items-center justify-center rounded-lg" style={{ width: "450px", height: "auto", backgroundColor: '#5e606d' }}>
        {/* <img src="EducatETH.jpg" alt="Imagen del NFT de EducatETH" className="w-120 h-120 rounded-lg justify-content-center"/> */}
        <img src="JuanFuente_BusinessCard.png" alt="Imagen del NFT de EducatETH" className="w-full h-auto rounded-lg justify-content-center"/>
      </div>
      <div className="p-4 border border-zinc-700 flex flex-col gap-5 items-center rounded-xl" style={{ backgroundColor: '#131524'}}>
        <ConnectButton showBalance={false} accountStatus={'avatar'} />
        {!isConnected? (
          <>
            <h2>First make sure your wallet is connected</h2>
          </>
        ) : (
          <div className="flex flex-col gap-5 items-center">
            <p className="text-xl  text-center">
              📇 <span className="font-bold">Address:</span>  {truncateEthAddress(safeAddress)}
            </p>
            <p className="text-xl  text-center">
              📊 <span className="font-bold">Posees este número de business cards activas:</span>{' '}
              {isLoading? (
                <span className="opacity-50">loading...</span>
              ) : (
                data?.toString()
              )}
            </p>
            <button
              className="py-1 px-3 bg-purple-900 rounded-lg hover:scale-105 transition-all disabled:opacity-50 text-xl bg-purple-600  text-xl"
              onClick={handleMint}
              disabled={isMinting}
            >
              {isMinting? 'Publicando...' : '📤 Publicar Card'}
            </button>
          </div>
        )}
      </div>
      <div className="p-4 border border-zinc-700 flex flex-col gap-5 items-center rounded-xl" style={{ backgroundColor: '#131524'}}>

      <div className="flex flex-row gap-4">
        <div className="flex flex-col">
        <label htmlFor="DestinationAddress">Dirección de destino:</label>
        <input
          type="text"
          placeholder="Dirección de destino"
          value={destinyAddress}
          onChange={(e) => setDestinyAddress(e.target.value)}
          className="border-2 border-gray-300 p-2 rounded-md w-full mb-4 text-base md:text-xl"
          style={{ backgroundColor: '#5e606d', fontSize: '20px', width: '430px' }}
          />
        </div>
        <div className="flex flex-col">
        <label htmlFor="amount">Cantidad:</label>
        <input
          type="number"
          placeholder="Amount"
          min="1" 
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="bg-gray-800 border-2 border-gray-300 p-2 rounded-md w-24 mb-4 text-base md:text-xl"
          style={{ backgroundColor: '#5e606d', fontSize: '20px' }}
          />
        </div>
        </div>
        <div>
        <button
          className="py-1 px-3 bg-purple-800 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 text-xl"
          onClick={handleTransfer}
          disabled={isMinting ||!destinyAddress ||!amount}
        >
          {isMinting? 'Transfiriendo...' : '📤 Transferir Card'}
        </button>
      </div>
    </div>
    </section>
  </main>
)
}
export default App
