// Deploy valido arbitrum sepolia: 0xc6f500f1fea380dbc2a0f6b2e2f5ad97c98bfd31
// Deploy valido arbitrum sepolia: 0xE19850B7F65aA43f2974AA5218bA705CB0562814
// hash: 0xc9593b2bd630f702cdbe169fc6715a2afa959e6557f7ac2d9694d95882ea698e
// signature: 0x4d16ff811ea2514bd6d5994dea945844609816fa5000d0aee1c48643f220a83c7d70a5bba0d92a729489f799767575f8c3cf222738f31649b22f7721dee13a7d1c
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useSignMessage, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESS } from './constants'
import { abi } from './assets/abis/erc1155AutenticationWithoutOnlyOwner'
import { createContext, useEffect, useState } from 'react'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { config } from './main'
import { toast } from 'react-toastify'
import { hashMessage, isAddress } from 'viem/utils'; 
import truncateEthAddress from 'truncate-eth-address';
import { signMessage } from '@wagmi/core'

import { ethers } from 'ethers'; // Asegúrate de tener ethers.js instalado y configurado

import { keccak256 } from 'ethers';
import { toUtf8Bytes } from 'ethers';
import { arrayify } from '@ethersproject/bytes';

function App(): JSX.Element {
  const { isError, signMessageAsync } = useSignMessage();
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const [destinyAddress, setDestinyAddress] = useState("");
  const [amount, setAmount] = useState(1);
  const safeAddress = address?? 'Please, connect your wallet'; // Se utiliza este string como placeholder
  const [balanceOf, setBalanceOf] = useState<string | undefined>(undefined);
//   const [isApprove, setIsApprove] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const BalanceContext = createContext({});

  const { data, isLoading, refetch } = useReadContract({
    abi,
    address: CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: [address],
  })

  // useEffect(() => {
  //   // Comprueba si hay datos disponibles y actualiza el estado balanceOf
  //   if (data) {
  //     setBalanceOf(data.toString());
  //     console.log("BalanceOf actualizado:", data.toString());
  //   } else {
  //     console.log("No hay datos");
  //   }
  // }, [data]); // Dependencia del efecto

  // useEffect(() => {
  //   if (isConnected) {
  //     refetch(); // Refetch los datos cuando el componente se monta o cuando la dirección cambia
  //   }
  // }, [isConnected, refetch]);

  // useEffect(() => {
  //   if (!isLoading && !isError && data) {
  //     setBalanceOf(data.toString());
  //     console.log("BalanceOf actualizado:", data.toString());
  //   }
  // }, [data, isLoading, isError]);

  
  const { writeContractAsync } = useWriteContract();
  const { signMessage } = useSignMessage();
  const [signedMessage, setSignedMessage] = useState<{ hash: string | null, signature: string | null }>({ hash: null, signature: null });  
  
 
  const handleMint = async () => {
    setIsMinting(true)
    const result = await handleSignMessage();
    if (!result || !result.message || !result.signature) {
      toast.error('Failed to sign message. Cannot proceed with minting.');
      setIsMinting(false);
      return;
    }

    const { message, signature } = result;
    const hash = keccak256(toUtf8Bytes(message)); // Generar el hash
      // const message = "Hola, EducatETH pagará el gas por ti";
      // const {hash, signature} = await handleSignMessage();
      // const signature = await handleSignMessage(message);
      // const signature = signMessage({ message });
      console.log("Hash", hash);
      console.log("address", address);
      console.log("Signature", signature);
    const isValidSignature = await verifySignature(message, signature, address);    
      if (!isValidSignature) {
        toast.error('Signature verification failed. Cannot proceed with minting.');
        setIsMinting(false);
        return;
      }
  

    try {
      const txHash = await writeContractAsync({
        abi,
        address: CONTRACT_ADDRESS,
        functionName: 'mint',
        args: [hash, signature, address, 1, 1],
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
const verifySignature = async (message: any, signature: any, address: any) => {
  // const messageHash = ethers.hashMessage(message); // Usar hashMessage de ethers
  const recoveredAddress = ethers.verifyMessage(message, signature); // Usar verifyMessage de ethers
  return recoveredAddress === address;
};


const handleSignMessage = async (): Promise<{ message: string | null; signature: string | null }> => {    try {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected or address not available');
      }
      
      const message = "Hola, firma para hacer una transaccion segura!";
      const hash = keccak256(toUtf8Bytes(message)); // Generar el hash
      console.log("Hash:", hash);
      
      const signature = await signMessageAsync({
        message, // Convertir el hash a formato adecuado
      });
  
      console.log("Signature:", signature);
      return { message, signature };
    } catch (error) {
      console.error("Failed to sign message:", error);
      toast.error('Failed to sign message. Try again.');
      return { message: null, signature: null };
    }
  };

  function uiConsole(...args: any[]): void {
    const el = document.querySelector("#console>p");
    if (el) {
      el.innerHTML = JSON.stringify(args || {}, null, 2);
    }
    console.log("Args: ", ...args);
  } 
  return (
    // <main className="flex min-h-screen flex-col items-center justify-center w-full  my-24" style={{ backgroundColor: '#08050d'}}>
    <main className="bg-slate-900 text-slate-200 flex min-h-screen flex-col items-center justify-center w-full h-full my-24 pb-24 mb-96 ">
      <section className="space-y-5">
        <h1 className="text-4xl font-bold text-center mt-24">
          🚀 Mint your ERC1155 EducatETH NFT 🚀
        </h1>
        <h2 className="text-2xl font-semibold text-center my-36">
          in Arbitrum Sepolia
        </h2>
        <div
          id="log"
          className="w-120 border border-zinc-500 rounded-lg flex flex-row items-center justify-content-center mx-auto my-auto"
          style={{ backgroundColor: "#131524" }}
        >
          {/* {loggedIn ? loggedInView : unloggedInView} */}
        </div>
        <div style={{ whiteSpace: "pre-line" }}>
          <p style={{ whiteSpace: "pre-line" }}></p>
        </div>
        {/* <div className="w-140 h-120 m-auto flex items-center justify-center rounded-lg" style={{ width: "600px", height: "600px", backgroundColor: '#5e606d' }}> */}
        <div
          className="bg-slate-600 w-140 h-140 m-auto flex items-center justify-center rounded-lg"
          style={{ width: "600px", height: "600px" }}
        >
          <img
            src="EducatETH.jpg"
            alt="Imagen del NFT de EducatETH"
            className="w-120 h-120 border border-slate-200 rounded-lg justify-content-center"
          />
        </div>
        <div
          className="p-4 border border-zinc-500 flex flex-col gap-5 items-center rounded-xl"
          style={{ backgroundColor: "#131524" }}
        >
          {/* <div className="p-4 bg-slate-800 border border-zinc-500 flex flex-col gap-5 items-center rounded-xl"> */}
          <ConnectButton showBalance={false} accountStatus={'avatar'} />
          {!isConnected ? (
            <>
              <h2>First make sure your wallet is connected</h2>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-5 items-center">
                <p className="text-xl  text-center">
                  📇 <span className="font-bold">Address:</span>  {truncateEthAddress(address || "Connect your wallet")}
                  {/* 📇 <span className="font-bold">Address:</span> {address} */}
                </p>
                <p>Balance: {balanceOf ?? "Loading..."}</p>
                <p className="text-xl  text-center">
                  📊{" "}
                  <span className="font-bold">
                    You own this number of NFTs:
                  </span>{" "}
                  {/* {isLoading? ( */}
                  {isLoading  ? (
                    <span className="opacity-50">loading...</span>
                  // ) : balanceOf? (
                  //   balanceOf.toString()
                  ) : data? (
                    data.toString()
                  ) : (
                    "No NFTs"
                  )}
                </p>
                <button
                  // className="py-1 px-3 bg-zinc-800 rounded-lg hover:scale-105 transition-all disabled:opacity-50 text-xl"
                  className="py-1 px-3 bg-slate-600 border-2 border-gray-300 rounded-lg hover:scale-105  hover:bg-slate-900 transition-all disabled:opacity-50 text-xl"
                  onClick={handleMint}
                  disabled={isMinting}
                >
                  {isMinting ? "Minting..." : "📤 Mint token"}
                </button>
              </div>

              <div
                className="p-4 border border-zinc-500 flex flex-col gap-5 items-center rounded-xl"
                style={{ backgroundColor: "#131524" }}
              >
                <div className="flex flex-row gap-4">
                  <div className="flex flex-col">
                    <label htmlFor="DestinationAddress">
                      Destination address:
                    </label>
                    <input
                      type="text"
                      placeholder="Destination Address"
                      value={destinyAddress}
                      onChange={(e) => setDestinyAddress(e.target.value)}
                      className="border-2 border-gray-300 bg-slate-600 p-2 rounded-md w-full mb-4 text-base md:text-xl"
                      // style={{ backgroundColor: '#5e606d', fontSize: '20px', width: '430px' }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="amount">Amount:</label>
                    <input
                      type="number"
                      placeholder="Amount"
                      min="1"
                      value={amount}
                      // onChange={(e) => setAmount(Number(e.target.value))}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="bg-slate-600 border-2 p-2 rounded-md w-24 mb-4 text-base md:text-xl"
                      // style={{ backgroundColor: '#5e606d', fontSize: '20px' }}
                    />
                  </div>
                </div>
                <div>
                  <button
                    className="py-1 px-3 bg-slate-600 border-2 border-2 border-gray-300 text-white rounded-lg hover:bg-slate-900 hover:scale-105 transition-all disabled:opacity-60 text-xl"
                    onClick={handleTransfer}
                    disabled={isTransferring || !destinyAddress || !amount}
                  >
                    {isTransferring ? "Transferring..." : "📤 Transfer tokens"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
export default App