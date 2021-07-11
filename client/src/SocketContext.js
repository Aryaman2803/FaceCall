import React, { createContext, useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'
import Peer from 'simple-peer'

const SocketContext = createContext()
const socket = io('http://localhost:3000')

const ContextProvider = ({ children }) => {
  const [stream, setStream] = useState(null)
  const [Me, setSetMe] = useState('')
  const [call, setCall] = useState({})
  const [callAccepted, setCallAccepted] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [name, setName] = useState('')

  //Immediately populate that video ifram with the src of our stream
  const myVideo = useRef()
  const userVideo = useRef()
  const connectionRef = useRef()

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream)
        //we are setting video to our ref and in state
        myVideo.current.srcObject = currentStream
      })

    socket.on('me', (id) => setSetMe(id))

    socket.on('calluser', ({ from, name: callerName, signal }) => {
      setCall({ isRecievedCall: true, from, name: callerName, signal })
    })
  }, [])

  const answerCall = () => {
    setCallAccepted(true)

    const peer = new Peer({ initiator: false, trickle: false, stream })

    peer.on('signal', (data) => {
      socket.emit('answercall', { signal: data, to: call.from })
    })
    //Now we are talking about the stream for the other person
    peer.on('stream', (currentStream) => {
      userVideo.current.srcObject = currentStream
    })
    peer.signal(call.signal)

    connectionRef.current = peer
  }

  const calluser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream })

    peer.on('signal', (data) => {
      socket.emit('calluser', {
        userToCall: id,
        signalData: data,
        from: Me,
        name,
      })
    })
    //Now we are talking about the stream for the other person
    peer.on('stream', (currentStream) => {
      userVideo.current.srcObject = currentStream
    })

    socket.on('callaccepted', (signal) => {
      setCallAccepted(true)
      peer.signal(signal)
    })

    connectionRef.current = peer
  }

  const leaveCall = () => {
    setCallEnded(true)
    connectionRef.current.destroy()

    window.location.reload()
  }

  return (
    <SocketContext.Provider
      value={{
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        Me,
        callEnded,
        calluser,
        leaveCall,
        answerCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export { ContextProvider, SocketContext }
