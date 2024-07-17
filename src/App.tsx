import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useSignMessage, useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESS } from './constants'
import { abi } from './assets/abis/erc1155AutenticationWithoutOnlyOwner'
import { useEffect, useState } from 'react'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { config } from './main'
import { toast } from 'react-toastify'
import { isAddress } from 'viem/utils'; 
import { Contract, ethers, hashMessage, JsonRpcProvider, Wallet, Signer } from "ethers";
import truncateEthAddress from 'truncate-eth-address';
// import Web3 from "web3";


function App(): JSX.Element {
  const { address, isConnected } = useAccount();
  const [destinyAddress, setDestinyAddress] = useState("");
  const safeAddress = address?? 'Please, connect your wallet'; // Se utiliza este string como placeholder
  const [amount, setAmount] = useState(1);
  const [contract, setContract] = useState<Contract | null>(null);
  const [balanceOf, setBalanceOf] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isApprove, setIsApprove] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [provider, setProvider] = useState<JsonRpcProvider  | null>(null);
  // const [signer, setSigner] = useState<Signer | null>(null);
  
  // const { signedMessage } = useSignMessage();

  useEffect(() => {
    ;(async () => {
    console.log("BALANCE ADDRESS", balanceOf);
    console.log("P KEY", import.meta.env.VITE_WALLET_PRIVATE_KEY );
    // const init = async () => {
      const provider: JsonRpcProvider = new JsonRpcProvider(
        import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL
        // process.env.VITE_ARBITRUM_SEPOLIA_RPC_URL
      );

      setProvider(provider);
      console.log("PROVIDER", provider);

      const signer: ethers.Wallet = new Wallet(
        // process.env.VITE_WALLET_PRIVATE_KEY || "",
        import.meta.env.VITE_WALLET_PRIVATE_KEY,
        provider
      );
      // setSigner(signer);
      console.log("Signer", signer);
      const initContract = new Contract(CONTRACT_ADDRESS, abi, signer);
      setContract(initContract);
      console.log("Contract", contract);

      setBalanceOf(await initContract.balanceOf(address, 1));
      // setBalanceOf(await initContract.balanceOf(initAddress));
      console.log("2BALANCE ADDRESS2", balanceOf);

      setIsApprove(
        await initContract.isApprovedForAll(address, CONTRACT_ADDRESS)
      );
      // initContract.on('Transfer', async (from, to, value) => {
        // if (address === from || address === to){
          //   setBalanceOf(await initContract.balanceOf(initAddress, 1));
      // }
      //})

      setIsLoading(false);
      console.log("isLoading_last", isLoading);
    // };

    // init();
  })()
  }, [balanceOf]);

  

  const handleMint = async () => {
    setIsMinting(true);
    try {
      // if (!ethers.isAddress(address)) {
      //   throw new Error('Invalid recipient address');
      // }
      const message = "Hola, EducatETH pagará el gas por ti";
      const hash = hashMessage(message);
      const signature = await signMessage(message);
      console.log("Hash", hash);
      console.log("address", address);
      console.log("Signature", signature);
      //hash 0x3073e9989ac6f090ebb98c322ca55ab133c1de6e5ad787f0c9161ff4a89106b6
      //signature 0x0c0cfd41ffca4d767f7637740964e654147a9fe9f8edace6f1923bfea604088b04029a29ed6311cadb3c632837c9a34367c8ec1b85a96e59d5b10e03dded7e611b
      // 0x3073e9989ac6f090ebb98c322ca55ab133c1de6e5ad787f0c9161ff4a89106b6
      // 0xa1496a1350adc2a37dbd972312b983ea0c0edd8ed6e1ca76a22463c97a6ff6c1429edc4828a5c2d4659c94cad9e1bd99b66c7cd6e09503114959e43d2bf3e5a11c
      // 0x3073e9989ac6f090ebb98c322ca55ab133c1de6e5ad787f0c9161ff4a89106b6
      // 0x0c0cfd41ffca4d767f7637740964e654147a9fe9f8edace6f1923bfea604088b04029a29ed6311cadb3c632837c9a34367c8ec1b85a96e59d5b10e03dded7e611b
      if (!contract) {
        throw new Error("Contract not found");
      }

      // const mintTx = await contract.mint(address, 1, 1);
      const mintTx = await contract.mint(hash, signature, address, 1, 1, {
        gasLimit: 5000000,
      });
      // const mintTx = await contract.mint(hash, signature, address, 7);
      // const mintTx = await contract.mint(address, 1, 1);
      await mintTx.wait();

      console.log("Prueba");
      setBalanceOf(await contract.balanceOf(address, 1));
      // setBalanceOf(await contract.balanceOf(address));

      toast("Minted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error while minting. Try again.");
    } finally {
      setIsMinting(false);
    }
  };
  const handleTransfer = async () => {
    if (!contract) {
      throw new Error("Contract not found");
    }

    setIsTransferring(true);
    if (!contract) {
      throw new Error("Contract not found");
    }
    try {
      console.log(
        "DatosTransfer",
        CONTRACT_ADDRESS,
        address,
        destinyAddress,
        BigInt("1"),
        BigInt(amount.toString())
      );

      const approveTx = await contract.setApprovalForAll(
        CONTRACT_ADDRESS,
        true
      );
      await approveTx.wait();
      console.log("approveTx", approveTx);
      contract.on("ApprovalForAll", (owner, operator, approved, event) => {
        console.log(`Evento ApprovalForAll recibido:
          Owner: ${owner}
          Operador: ${operator}
          Aprobado: ${approved}
          Evento: ${event}`);
      });

      const transferFromTx = await contract.safeTransferFrom(
        address,
        destinyAddress,
        BigInt("1"),
        BigInt(amount.toString()),
        "0x",
        {
          gasLimit: 5000000,
        }
      );
      if (!transferFromTx) {
        console.error(
          "Error al transferir:",
          transferFromTx?.reason || "No se pudo determinar el motivo."
        );
      }
      await transferFromTx.wait();

      // setBalanceOf(await contract.balanceOf(address));
      setBalanceOf(await contract.balanceOf(address, 1));
      // setAllowance(
      //   await contract.allowance(
      //     address,
      //     "0xD96B642Ca70edB30e58248689CEaFc6E36785d68"
      //   )
      // );

      toast("Transferred successfully");

      // refetch()
    } catch (error: any) {
      if (error.message.includes("Invalid sender address")) {
        toast.error("Sender address is invalid. Please check and try again.");
      } else if (error.message.includes("Invalid recipient address")) {
        toast.error(
          "Recipient address is invalid. Please check and try again."
        );
      } else {
        toast.error("Error while transferring. Try again.");
      }
      console.error(error);
    } finally {
      setIsTransferring(false);
    }
  };

  // const signMessage = async (message: string) => {
  //   // const signMessage = async () => {
  //   if (!provider) {
  //     uiConsole("provider not initialized yet");
  //     return;
  //   }
  //   const web3 = new Web3(provider as any);

  //   // Get user's Ethereum public address
  //   const fromAddress = (await web3.eth.getAccounts())[0];

  //   // Sign the message
  //   const signedMessage = await web3.eth.personal.sign(
  //     message,
  //     fromAddress,
  //     "test password!" // configure your own password here.
  //   );
  //   // uiConsole(signedMessage);
  //   if (!signedMessage) {
  //     throw new Error("Failed to sign message");
  //   }

  //   return signedMessage;
  // };
  const signMessage = async (message: string) => {
    // const signMessage = async () => {
    if (!provider) {
      uiConsole("provider not initialized yet");
      return;
    }
    // if (!signer) {
    //   uiConsole("signer not initialized yet");
    //   return;
    // }
    if (typeof window.ethereum !== 'undefined') {
      // Crear un nuevo proveedor Web3Provider
      let provider2 = new ethers.BrowserProvider(window.ethereum)    
      // Ahora puedes usar `provider` para interactuar con la blockchain Ethereum
      const signer = await provider2.getSigner();
         // const provider: ethers.providers.JsonRpcProvider = new ethers.providers.Web3Provider(window.ethereum);

    // Get user's Ethereum public address
    // const fromAddress = await signer.getAddress();
    // const signer: ethers.Wallet = new Wallet(
    //   //process.env.VITE_WALLET_PRIVATE_KEY || "",
    //   import.meta.env.VITE_WALLET_PRIVATE_KEY || "",
    //   provider
    // );
    
    console.log("Signer", signer);

    // Sign the message
    const signedMessage = await signer.signMessage(
      message
    );
    // uiConsole(signedMessage);
    if (!signedMessage) {
      throw new Error("Failed to sign message");
    }
    console.log("Message signed", signMessage);
    return signedMessage;
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
                <p className="text-xl  text-center">
                  📊{" "}
                  <span className="font-bold">
                    You own this number of NFTs:
                  </span>{" "}
                  {/* {isLoading? ( */}
                  {isMinting ? (
                    <span className="opacity-50">loading...</span>
                  ) : balanceOf ? (
                    balanceOf.toString()
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
