"use client";
import React, { useRef, useEffect, useState, useCallback, use } from "react";
import Webcam from "react-webcam";
import { parseEther } from "viem";
import {
  useConnect,
  useAccount,
  useDisconnect,
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import Image from "next/image";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/config";
import { useProvider } from "@/provider/Provider";
import { motion, AnimatePresence } from "framer-motion";

import { Stats } from "./Stats";

import Illustration2 from "@/public/illustrations/illustration2.png";
import Logo from "@/public/logo.svg";
import Krilin from "@/public/krilin.svg";
import Kiln from "@/public/kiln.svg";

import { toast } from "sonner";

const HandGestureWalletConnect: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const walletButtonRef = useRef<HTMLButtonElement>(null);
  const disconnectButtonRef = useRef<HTMLButtonElement>(null);
  const sendTxButtonRef = useRef<HTMLButtonElement>(null);
  const stakeButtonRef1 = useRef<HTMLButtonElement>(null);
  const stakeButtonRef2 = useRef<HTMLButtonElement>(null);
  const stakeButtonRef3 = useRef<HTMLButtonElement>(null);
  const unstakeButtonRef = useRef<HTMLButtonElement>(null);

  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [isOver, setIsOver] = useState("");
  const [walletButtonClicked, setWalletButtonClicked] = useState(false);
  const [disconnectButtonClicked, setDisconnectButtonClicked] = useState(false);
  const [sendTxButtonClicked, setSendTxButtonClicked] = useState(false);
  const [unstakeButtonClicked, setUnstakeButtonClicked] = useState(false);
  const [isStakeHovered, setIsStakeHovered] = useState(false);
  const stakeOptions = [0.01, 0.05, 0.1];

  const { rate, refreshBalance } = useProvider();
  const { connectors, connect } = useConnect();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const walletConnectConnector = connectors.find(
    (connector) => connector.name.toLowerCase() === "walletconnect"
  );

  const handleWalletButtonClick = useCallback(() => {
    console.log("WalletConnect button clicked!");
    setWalletButtonClicked(true);
    setTimeout(() => setWalletButtonClicked(false), 500);
    if (walletConnectConnector) {
      connect(
        { connector: walletConnectConnector },
        {
          onSuccess: () => {
            toast.success("Wallet Connected");
            console.log("Connection successful");
          },
          onError: (error) => {
            toast.error("Something went wrong");
            console.error("Connection failed:", error);
          },
        }
      );
    }
  }, [connect, walletConnectConnector]);

  const handleDisconnect = useCallback(() => {
    console.log("Disconnecting...");
    setDisconnectButtonClicked(true);
    setTimeout(() => setDisconnectButtonClicked(false), 500);
    disconnect();
    toast.error("Wallet Disconnected");
  }, [disconnect]);

  const sendTx = useCallback(
    async (amount: number) => {
      console.log(`Sending transaction with ${amount} ETH...`);
      setSendTxButtonClicked(true);
      setTimeout(() => setSendTxButtonClicked(false), 500);

      writeContract({
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "stake",
        value: parseEther(amount.toString()),
      });
    },
    [writeContract]
  );

  const unStacke = useCallback(async () => {
    console.log("Requesting exit...");
    setUnstakeButtonClicked(true);
    setTimeout(() => setUnstakeButtonClicked(false), 500);

    writeContract({
      abi: CONTRACT_ABI,
      address: CONTRACT_ADDRESS,
      functionName: "requestExit",
      args: [BigInt(Math.floor(0.009 * rate))],
    });

    // Display information to the user
    toast.info("Exit request submitted. Processing takes ~4 days on average.");
    toast.info(
      "You will receive an exit ticket (soulbound NFT) for your pending exit position."
    );
  }, [writeContract, rate]);

  useEffect(() => {
    let hands: any;
    let lastClickTime = 0;

    const runHandpose = async () => {
      const handsModule = await import("@mediapipe/hands");
      hands = new handsModule.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        },
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(onResults);
    };

    const startCamera = async () => {
      if (webcamRef.current && webcamRef.current.video) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        webcamRef.current.video.srcObject = stream;
        webcamRef.current.video.onloadedmetadata = () => {
          if (webcamRef.current && webcamRef.current.video) {
            webcamRef.current.video.play();
            detectHands();
          }
        };
      }
    };

    const detectHands = async () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        hands &&
        !webcamRef.current.video.paused &&
        !webcamRef.current.video.ended
      ) {
        const video = webcamRef.current.video;
        await hands.send({ image: video });
        requestAnimationFrame(detectHands);
      }
    };

    const onResults = (results: any) => {
      const canvasCtx = canvasRef.current?.getContext("2d");
      if (!canvasCtx || !canvasRef.current) return;

      canvasCtx.save();
      canvasCtx.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        const centerPoint = hand[9]; // Center of the hand (between middle and ring finger)
        const thumb = hand[4];
        const index = hand[8];

        // Update cursor position based on hand center
        const x = (1 - centerPoint.x) * window.innerWidth;
        const y = centerPoint.y * window.innerHeight;
        setCursorPosition({ x, y });

        // Check for pinch gesture (thumb and index finger close together)
        const distance = Math.sqrt(
          Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
        );
        const isPinching = distance < 0.05;
        setIsClicking(isPinching);

        if (isOverButton({ x, y }, walletButtonRef)) {
          setIsOver("wallet");
        } else if (isOverButton({ x, y }, disconnectButtonRef)) {
          setIsOver("disconnect");
        } else if (isOverStakeArea({ x, y })) {
          setIsOver("stake");
          setIsStakeHovered(true);
        } else {
          setIsOver("");
          setIsStakeHovered(false);
        }

        // Trigger button click if pinching over the button
        if (isPinching && Date.now() - lastClickTime > 1000) {
          if (isOverButton({ x, y }, walletButtonRef)) {
            handleWalletButtonClick();
            lastClickTime = Date.now();
          } else if (isOverButton({ x, y }, disconnectButtonRef)) {
            handleDisconnect();
            lastClickTime = Date.now();
          } else if (isOverButton({ x, y }, stakeButtonRef1)) {
            sendTx(stakeOptions[0]);
            lastClickTime = Date.now();
          } else if (isOverButton({ x, y }, stakeButtonRef2)) {
            sendTx(stakeOptions[1]);
            lastClickTime = Date.now();
          } else if (isOverButton({ x, y }, stakeButtonRef3)) {
            sendTx(stakeOptions[2]);
            lastClickTime = Date.now();
          }
        }

        // Draw hand landmarks on the canvas (optional, for visualization)
        for (const landmark of hand) {
          canvasCtx.beginPath();
          canvasCtx.arc(
            landmark.x * canvasRef.current.width,
            landmark.y * canvasRef.current.height,
            5,
            0,
            2 * Math.PI
          );
          canvasCtx.fillStyle = "white";
          canvasCtx.fill();
        }
      }

      canvasCtx.restore();
    };

    const isOverButton = (
      position: { x: number; y: number },
      buttonRef: React.RefObject<HTMLButtonElement>
    ) => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        return (
          position.x >= rect.left &&
          position.x <= rect.right &&
          position.y >= rect.top &&
          position.y <= rect.bottom
        );
      }
      return false;
    };

    const isOverStakeArea = (position: { x: number; y: number }) => {
      const stakeArea = document.querySelector(".stake-area");
      if (stakeArea) {
        const rect = stakeArea.getBoundingClientRect();
        return (
          position.x >= rect.left &&
          position.x <= rect.right &&
          position.y >= rect.top &&
          position.y <= rect.bottom
        );
      }
      return false;
    };

    runHandpose();
    startCamera();

    return () => {
      if (hands) {
        hands.close();
      }
    };
  }, [handleWalletButtonClick, handleDisconnect, sendTx, unStacke]);

  useEffect(() => {
    if (isPending) {
      toast.loading("User Signature pending...");
    } else if (!isPending) {
      toast.dismiss();
      toast.success("User Signature confirmed!");
    }
  }, [isPending]);
  useEffect(() => {
    if (isConfirming) {
      toast.loading("Transaction pending...");
    }
  }, [isConfirming]);
  useEffect(() => {
    if (isConfirmed) {
      toast.dismiss();
      refreshBalance();
      toast.success("Transaction confirmed!");
    }
  }, [isConfirmed]);

  if (!walletConnectConnector) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen">
      {/* Header */}
      <div className="absolute w-full h-[10vh] top-0 transform z-20 px-8 flex items-center justify-between">
        <Image src={Krilin} alt="Krilin" className="w-44" />
        {isConnected && (
          <div className="flex items-center">
            <div className="mr-2">
              {address?.slice(0, 6) + "..." + address?.slice(-6, -1)}
            </div>
            <button
              ref={disconnectButtonRef}
              onClick={handleDisconnect}
              className="border-2 text-black border-black rounded-full py-2 px-4"
              style={{
                backgroundColor: disconnectButtonClicked ? "#0F3272" : "",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
              }}
            >
              Disconnect
            </button>{" "}
          </div>
        )}
      </div>

      {/* Main */}
      {!isConnected ? (
        <>
          <Image
            src={Illustration2}
            alt="illustration"
            className="absolute bottom-6 left-1/2 w-[60vw] -translate-x-1/2"
          />
          <div className="absolute top-[30%] w-full left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center flex-col space-y-8">
            <h1 className="text-5xl font-bold">
              Stack your crypto without hands
            </h1>
            <button
              ref={walletButtonRef}
              onClick={handleWalletButtonClick}
              className="border-2 text-white rounded-full py-2 px-8"
              style={{
                backgroundColor: walletButtonClicked ? "#0F3272" : "#114FC1",
                cursor: "pointer",
                transition: "all 0.3s ease",
                scale: isOver === "wallet" ? 1.1 : 1,
              }}
            >
              Connect
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="absolute top-[65%] w-[80vw] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-around">
            <motion.div
              className="relative w-64 aspect-square flex items-center justify-center stake-area"
              onHoverStart={() => setIsStakeHovered(true)}
              onHoverEnd={() => setIsStakeHovered(false)}
            >
              <AnimatePresence>
                {!isStakeHovered && (
                  <motion.button
                    className="border-2 text-white rounded-full py-2 px-8 text-2xl w-[90%]"
                    style={{
                      backgroundColor: sendTxButtonClicked
                        ? "#0F3272"
                        : "#114FC1",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      scale: isOver === "stake" ? 1.1 : 1,
                    }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Stake
                  </motion.button>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {isStakeHovered && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <motion.button
                      ref={stakeButtonRef1}
                      className="absolute border-2 text-white rounded-full py-1 px-8 text-xl top-[30%] left-0"
                      style={{
                        backgroundColor: "#114FC1",
                        scale: isOver === `stake_${stakeOptions[0]}` ? 1.1 : 1,
                      }}
                    >
                      {stakeOptions[0]}
                    </motion.button>
                    <motion.button
                      ref={stakeButtonRef2}
                      className="absolute border-2 text-white rounded-full py-1 px-8 text-xl top-[30%] right-0"
                      style={{
                        backgroundColor: "#114FC1",
                        cursor: "pointer",
                        scale: isOver === `stake_${stakeOptions[1]}` ? 1.1 : 1,
                      }}
                    >
                      {stakeOptions[1]}
                    </motion.button>
                    <motion.button
                      ref={stakeButtonRef3}
                      className="absolute border-2 text-white rounded-full py-1 px-8 text-xl top-[13%] "
                      style={{
                        backgroundColor: "#114FC1",
                        cursor: "pointer",
                        scale: isOver === `stake_${stakeOptions[2]}` ? 1.1 : 1,
                      }}
                    >
                      {stakeOptions[2]}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}

      <Stats />

      {/* Footer */}
      <div className="absolute w-full h-[10vh] bottom-0 px-8 flex items-center justify-between">
        <div className=""></div>
        <div className="flex items-center justify-center space-x-2">
          <h1 className="font-bold">Featured by</h1>
          <Image src={Kiln} alt="kiln" className="w-20" />
        </div>
      </div>

      {/* Webcam in top right corner */}
      <div className="absolute bottom-4 left-4 w-[20%] h-[20%] z-10 ">
        <Webcam
          ref={webcamRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            borderRadius: "10px",
          }}
        />
      </div>

      {/* Visual cursor */}
      <div
        style={{
          position: "absolute",
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`,
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: isClicking ? "#FFFFFF" : "#114FC1",
          border: "2px solid #FFFFFF",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          transition: "all 0.1s ease-out",
          zIndex: 30,
        }}
      />
    </div>
  );
};

export default HandGestureWalletConnect;
